import * as dotenv from 'dotenv';
import { network, loanFee, fixed } from '../../lib/config';
import 'colors';
import inquirer from 'inquirer';
import { Table } from 'console-table-printer';
import BN from 'bignumber.js';
import { Contract } from 'web3-eth-contract';
import DEXS from '../../config/dexs.json';
import { flashSwap } from '../../lib/contracts';
import { CallData, Token } from '../../lib/types';
import TOKEN from '../../config/mainnet.json';
import { getAllowance, getApproveEncode, getPriceOnOracle, toPrintable } from '../../lib/utils';
import { callFlashSwap, maxInt, printAccountBalance } from '../common';
import { DEX, getAllQuotes } from './common';
// import { getSwapOnUniV1 } from '../../lib/uniswap/v1/getCalldata';
import { getSwapOnUniV2 } from '../../lib/uniswap/v2/getCalldata';
import { getSwapOnUniV3 } from '../../lib/uniswap/v3/getCalldata';
import { getSwapOnMooni } from '../../lib/mooniswap/getCalldata';
import { getSwapOnBancorV3 } from '../../lib/bancor/getCalldata';
import { getSwapOnSmoothy } from '../../lib/smoothy/getCalldata';
import { getSwapOnDODOV1 } from '../../lib/dodo/v1/getCalldata';

dotenv.config({ path: __dirname + '/../../.env' });

let maxBalance: string;
const amountMin: BN = new BN(1);

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
    maxBalance = await printAccountBalance(tokens);
}

/**
 * Calculate trade result.
 * @param inputAmount Start amount of trade.
 * @returns ```[profit, table, dexPath, tokenPath]```
 */
const runBot = async (inputAmount: BN) => {
    const table = new Table();
    const tradeDatas: CallData[] = [];
    let dexName: string;
    const [a, b] = new BN(loanFee).toFraction();
    const feeAmount = inputAmount.times(a).idiv(b);
    const path = tokens.map(t => t.address);
    path.push(path[0]);
    const [amountOut, contracts] = await getAllQuotes(inputAmount, path);
    const maxAmountOut = BN.max(...amountOut);
    let amountIn: string = toPrintable(inputAmount, tokens[0].decimals, fixed);
    let maxAmountPrint: string = toPrintable(maxAmountOut, tokens[0].decimals, fixed);

    if (maxAmountOut.eq(amountOut[0])) {
        dexName = DEX[0];
        if (maxAmountOut.gt(await getAllowance(tokens[0], flashSwap.options.address, contracts[0].options.address)))
            tradeDatas.push([tokens[0].address, getApproveEncode(tokens[0], contracts[0].options.address, maxInt)]);
        tradeDatas.push([
            contracts[0].options.address, 
            getSwapOnUniV2(inputAmount, amountMin, path, flashSwap.options.address, contracts[0])
        ]);
    }
    else if (maxAmountOut.eq(amountOut[1])) {
        dexName = DEX[1];
        if (maxAmountOut.gt(await getAllowance(tokens[0], flashSwap.options.address, contracts[1].options.address)))
            tradeDatas.push([tokens[0].address, getApproveEncode(tokens[0], contracts[1].options.address, maxInt)]);
        tradeDatas.push([
            contracts[1].options.address,
            getSwapOnUniV2(inputAmount, amountMin, path, flashSwap.options.address, contracts[1])
        ]);
    }
    else if (maxAmountOut.eq(amountOut[2])) {
        dexName = DEX[2];
        if (maxAmountOut.gt(await getAllowance(tokens[0], flashSwap.options.address, contracts[2].options.address)))
            tradeDatas.push([tokens[0].address, getApproveEncode(tokens[0], contracts[2].options.address, maxInt)]);
        tradeDatas.push([
            contracts[2].options.address,
            getSwapOnUniV2(inputAmount, amountMin, path, flashSwap.options.address, contracts[2])
        ]);
    }
    else if (maxAmountOut.eq(amountOut[3])) {
        dexName = DEX[3];
        if (maxAmountOut.gt(await getAllowance(tokens[0], flashSwap.options.address, contracts[3].options.address)))
            tradeDatas.push([tokens[0].address, getApproveEncode(tokens[0], contracts[3].options.address, maxInt)]);
        tradeDatas.push([
            contracts[3].options.address,
            getSwapOnUniV2(inputAmount, amountMin, path, flashSwap.options.address, contracts[3])
        ]);
    }
    else if (maxAmountOut.eq(amountOut[4])) {
        dexName = DEX[4];
        if (maxAmountOut.gt(await getAllowance(tokens[0], flashSwap.options.address, contracts[4].options.address)))
            tradeDatas.push([tokens[0].address, getApproveEncode(tokens[0], contracts[4].options.address, maxInt)]);
        tradeDatas.push([
            contracts[4].options.address,
            getSwapOnUniV2(inputAmount, amountMin, path, flashSwap.options.address, contracts[4])
        ]);
    }
    else if (maxAmountOut.eq(amountOut[5])) {
        dexName = DEX[5];
        if (maxAmountOut.gt(await getAllowance(tokens[0], flashSwap.options.address, contracts[5].options.address)))
            tradeDatas.push([tokens[0].address, getApproveEncode(tokens[0], contracts[5].options.address, maxInt)]);
        tradeDatas.push([
            contracts[5].options.address,
            getSwapOnUniV2(inputAmount, amountMin, path, flashSwap.options.address, contracts[5])
        ]);
    }
    else if (maxAmountOut.eq(amountOut[6])) {
        dexName = DEX[6];
        if (maxAmountOut.gt(await getAllowance(tokens[0], flashSwap.options.address, contracts[6].options.address)))
            tradeDatas.push([tokens[0].address, getApproveEncode(tokens[0], contracts[6].options.address, maxInt)]);
        tradeDatas.push([
            contracts[6].options.address,
            getSwapOnUniV2(inputAmount, amountMin, path, flashSwap.options.address, contracts[6])
        ]);
    }
    
    table.addRow({
        'Input Token': `${amountIn} ${tokens[0].symbol}`,
        [dexName]: `${maxAmountPrint} ${tokens[0].symbol}`
    });

    // console.log(tradeDatas);
    const price = await getPriceOnOracle(tokens[0]);
    const profit = maxAmountOut.minus(inputAmount).minus(feeAmount);
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
        response.isExe === 'yes' && await callFlashSwap(tokens[0].address, inputAmount, tradeDatas, flashSwap);
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
        if (maxBalance == undefined || new BN(input).gt(new BN(maxBalance))) {
            console.log("Input exceed Max Loan Amount!".red);
            continue;
        }
        await runBot(new BN(input).times(new BN(10).pow(tokens[0].decimals)));
    }
}

main();