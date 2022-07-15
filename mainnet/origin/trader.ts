import * as dotenv from 'dotenv';
import { network, loanFee, fixed } from '../../lib/config';
import 'colors';
import inquirer from 'inquirer';
import { Table } from 'console-table-printer';
import BN from 'bignumber.js';
import { dfRouter, flashSwap, lkRouter, shRouter, suRouter, un2Router, un3Router } from '../../lib/contracts';
import { getPriceOnOracle, toPrintable } from '../../lib/utils';
import { getSwapOnUniV2 } from '../../lib/uniswap/v2/getCalldata';
import { getSwapOnUniv3 } from '../../lib/uniswap/v3/getCalldata';

// Types
import { Token } from '../../lib/types';
import TOKEN from '../../config/mainnet.json';
import { callFlashSwap, printAccountBalance } from '../common';
import { DEX, getAllQuotes } from './common';

dotenv.config({ path: __dirname + '/../../.env' });

let maxInputAmount: BN;


const tokens: Token[] = [];

/**
 * Initialize token contracts.
 */
const initTokenContract = async () => {
    console.log('-------------------------------------------------------------------------------------------------------------------');
    console.log('-------------------------------------------------------------------------------------------------------------------');
    console.log(`Bot is running on ${network.yellow}. Initializing...`);
    console.log();
    // Initialize token contracts and decimals.
    maxInputAmount = await printAccountBalance(tokens);
}

/**
 * Calculate trade result.
 * @param inputAmount Start amount of trade.
 * @returns ```[profit, table, dexPath, tokenPath]```
 */
const runBot = async (inputAmount: BN) => {
    const table = new Table();
    const tokenPath: string[] = tokens.map(_token => _token.address);
    const spenders: string[] = [];
    const routers: string[] = [];
    const tradeDatas: string[] = [];
    const maxAmountOut: BN[] = [inputAmount,];
    const amountOut: BN[][] = [];
    let dexName: string;
    const [a, b] = new BN(loanFee).toFraction();
    const feeAmount = inputAmount.times(a).idiv(b);

    for (let i = 0; i < tokens.length; i++) {
        let next = (i + 1) % tokens.length;

        amountOut[i] = await getAllQuotes(maxAmountOut[i], tokens[i].address, tokens[next].address);
        maxAmountOut[i + 1] = BN.max(...amountOut[i]);
        let amountIn: string = toPrintable(maxAmountOut[i], tokens[i].decimals, fixed);
        let maxAmountPrint: string = toPrintable(maxAmountOut[i + 1], tokens[next].decimals, fixed);

        if (maxAmountOut[i + 1].eq(amountOut[i][0])) {
            dexName = DEX[0];
            spenders.push(un3Router.options.address);
            routers.push(un3Router.options.address);
            tradeDatas.push(getSwapOnUniv3(maxAmountOut[i], maxAmountOut[i + 1], [tokens[i].address, tokens[next].address], flashSwap.options.address));
        }
        else if (maxAmountOut[i + 1].eq(amountOut[i][1])) {
            dexName = DEX[1];
            spenders.push(un2Router.options.address);
            routers.push(un2Router.options.address);
            tradeDatas.push(getSwapOnUniV2(maxAmountOut[i], maxAmountOut[i + 1], [tokens[i].address, tokens[next].address], flashSwap.options.address, un2Router));
        }
        else if (maxAmountOut[i + 1].eq(amountOut[i][2])) {
            dexName = DEX[2];
            spenders.push(suRouter.options.address);
            routers.push(suRouter.options.address);
            tradeDatas.push(getSwapOnUniV2(maxAmountOut[i], maxAmountOut[i + 1], [tokens[i].address, tokens[next].address], flashSwap.options.address, suRouter));
        }
        else if (maxAmountOut[i + 1].eq(amountOut[i][3])) {
            dexName = DEX[3];
            spenders.push(shRouter.options.address);
            routers.push(shRouter.options.address);
            tradeDatas.push(getSwapOnUniV2(maxAmountOut[i], maxAmountOut[i + 1], [tokens[i].address, tokens[next].address], flashSwap.options.address, shRouter));
        }
        else if (maxAmountOut[i + 1].eq(amountOut[i][4])) {
            dexName = DEX[4];
            spenders.push(dfRouter.options.address);
            routers.push(dfRouter.options.address);
            tradeDatas.push(getSwapOnUniV2(maxAmountOut[i], maxAmountOut[i + 1], [tokens[i].address, tokens[next].address], flashSwap.options.address, dfRouter));
        }
        else if (maxAmountOut[i + 1].eq(amountOut[i][5])) {
            dexName = DEX[5];
            spenders.push(lkRouter.options.address);
            routers.push(lkRouter.options.address);
            tradeDatas.push(getSwapOnUniV2(maxAmountOut[i], maxAmountOut[i + 1], [tokens[i].address, tokens[next].address], flashSwap.options.address, lkRouter));
        }
        
        table.addRow({
            'Input Token': `${amountIn} ${tokens[i].symbol}`,
            [dexName]: `${maxAmountPrint} ${tokens[next].symbol}`
        });
    }
    // console.log(tokenPath);
    // console.log([inputAmount.toFixed(), '0']);
    // console.log(routers);
    // console.log(tradeDatas);
    table.printTable();
    const price = await getPriceOnOracle(tokens[0], TOKEN.USDT);
    const profit = maxAmountOut[tokens.length].minus(maxAmountOut[0]).minus(feeAmount);
    const profitUSD = profit.times(price); 
    console.log(
        'Input:',
        toPrintable(inputAmount, tokens[0].decimals, fixed),
        tokens[0].symbol,
        '\tEstimate profit:',
        profit.gt(0) ?
            profit.div(new BN(10).pow(tokens[0].decimals)).toFixed(fixed).green :
            profit.div(new BN(10).pow(tokens[0].decimals)).toFixed(fixed).red,
        tokens[0].symbol,
        '($',
            profitUSD.gt(0) ?
                profitUSD.div(new BN(10).pow(tokens[0].decimals)).toFixed(fixed).green :
                profitUSD.div(new BN(10).pow(tokens[0].decimals)).toFixed(fixed).red,
        ')'
    );
    if (profit.gt(0)) {
        let response = await inquirer.prompt([{
            type: 'input',
            name: 'isExe',
            message: `Are you sure execute this trade? (yes/no)`
        }]);
        response.isExe === 'yes' && await callFlashSwap(tokens[0].address, inputAmount, tokenPath, spenders, routers, tradeDatas);
    }

}

/**
 * Bot start here.
 */
const main = async () => {
    let args = process.argv.slice(2);
    if (args.length < 2) {
        console.log('Please input at least two token.');
        process.exit();
    }
    args.forEach(arg => {
        let symbol = arg.toUpperCase();
        if (!TOKEN[symbol]) {
            console.log(`There's no ${symbol} token.`);
            process.exit();
        }
        tokens.push(TOKEN[symbol]);
    });

    await initTokenContract();
    while (true) {
        let response = await inquirer.prompt([{
            type: 'input',
            name: 'input',
            message: `Please input ${tokens[0].symbol} amount:`
        }]);
        let input = parseFloat(response.input);
        if (isNaN(input) || input <= 0) continue;
        if (maxInputAmount == undefined || new BN(input).gt(maxInputAmount)) {
            console.log("Input exceed Max Loan Amount!".red);
            continue;
        }
        await runBot(new BN(input).times(new BN(10).pow(tokens[0].decimals)));
    }
}

main();