import * as dotenv from 'dotenv';
import { network, loanFee, fixed } from '../../lib/config';
import 'colors';
import inquirer from 'inquirer';
import { Table } from 'console-table-printer';
import BN from 'bignumber.js';
import { Contract } from 'web3-eth-contract';
import { flashSwap } from '../../lib/contracts';
import { getPriceOnOracle, toPrintable } from '../../lib/utils';
import { getSwapOnUniV2 } from '../../lib/uniswap/v2/getCalldata';
import { getSwapOnUniv3 } from '../../lib/uniswap/v3/getCalldata';

// Types
import { Token } from '../../lib/types';
import TOKEN from '../../config/mainnet.json';
import { callFlashSwap, printAccountBalance } from '../common';
import { DEX, getAllQuotes } from './common';
import { getSwapOnMooni } from '../../lib/mooniswap/getCalldata';

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
        let contracts: Contract[];
        [amountOut[i], contracts] = await getAllQuotes(maxAmountOut[i], tokens[i], tokens[next]);
        maxAmountOut[i + 1] = BN.max(...amountOut[i]);
        let amountIn: string = toPrintable(maxAmountOut[i], tokens[i].decimals, fixed);
        let maxAmountPrint: string = toPrintable(maxAmountOut[i + 1], tokens[next].decimals, fixed);

        if (maxAmountOut[i + 1].eq(amountOut[i][0])) {
            dexName = DEX[0];
            spenders.push(contracts[0].options.address);
            routers.push(contracts[0].options.address);
            tradeDatas.push(getSwapOnUniv3(maxAmountOut[i], maxAmountOut[i + 1], [tokens[i].address, tokens[next].address], flashSwap.options.address));
        }
        else if (maxAmountOut[i + 1].eq(amountOut[i][1])) {
            dexName = DEX[1];
            spenders.push(contracts[1].options.address);
            routers.push(contracts[1].options.address);
            tradeDatas.push(getSwapOnUniV2(maxAmountOut[i], maxAmountOut[i + 1], [tokens[i].address, tokens[next].address], flashSwap.options.address, contracts[1]));
        }
        else if (maxAmountOut[i + 1].eq(amountOut[i][2])) {
            dexName = DEX[2];
            spenders.push(contracts[2].options.address);
            routers.push(contracts[2].options.address);
            tradeDatas.push(getSwapOnUniV2(maxAmountOut[i], maxAmountOut[i + 1], [tokens[i].address, tokens[next].address], flashSwap.options.address, contracts[2]));
        }
        else if (maxAmountOut[i + 1].eq(amountOut[i][3])) {
            dexName = DEX[3];
            spenders.push(contracts[3].options.address);
            routers.push(contracts[3].options.address);
            tradeDatas.push(getSwapOnUniV2(maxAmountOut[i], maxAmountOut[i + 1], [tokens[i].address, tokens[next].address], flashSwap.options.address, contracts[3]));
        }
        else if (maxAmountOut[i + 1].eq(amountOut[i][4])) {
            dexName = DEX[4];
            spenders.push(contracts[4].options.address);
            routers.push(contracts[4].options.address);
            tradeDatas.push(getSwapOnUniV2(maxAmountOut[i], maxAmountOut[i + 1], [tokens[i].address, tokens[next].address], flashSwap.options.address, contracts[4]));
        }
        else if (maxAmountOut[i + 1].eq(amountOut[i][5])) {
            dexName = DEX[5];
            spenders.push(contracts[5].options.address);
            routers.push(contracts[5].options.address);
            tradeDatas.push(getSwapOnUniV2(maxAmountOut[i], maxAmountOut[i + 1], [tokens[i].address, tokens[next].address], flashSwap.options.address, contracts[5]));
        }
        else if (maxAmountOut[i + 1].eq(amountOut[i][6])) {
            dexName = DEX[6];
            spenders.push(contracts[6].options.address);
            routers.push(contracts[6].options.address);
            tradeDatas.push(getSwapOnMooni(maxAmountOut[i], maxAmountOut[i + 1], [tokens[i].address, tokens[next].address], flashSwap.options.address, contracts[6]));
        }
        table.addRow({
            'Input Token': `${amountIn} ${tokens[i].symbol}`,
            [dexName]: `${maxAmountPrint} ${tokens[next].symbol}`
        });
    }
  
    const price = await getPriceOnOracle(tokens[0]);
    const profit = maxAmountOut[tokens.length].minus(maxAmountOut[0]).minus(feeAmount);
    const profitUSD = profit.times(price);
    const profitPrint = toPrintable(profit, tokens[0].decimals, fixed);
    const profitUSDPrint = toPrintable(profitUSD, tokens[0].decimals + 8, fixed);
    if (profit.isFinite()) {
        table.printTable();
        console.log(
            'Input:', toPrintable(inputAmount, tokens[0].decimals, fixed), tokens[0].symbol,
            '\tEstimate profit:', profit.gt(0) ? profitPrint.green : profitPrint.red, tokens[0].symbol,
            '($', profitUSD.gt(0) ? profitUSDPrint.green : profitUSDPrint.red, ')'
        )
    }

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