import BN from 'bignumber.js';
import 'colors';
import inquirer from 'inquirer';
import { Table } from 'console-table-printer';
import { network, loanFee, fixed } from '../../lib/config';
import { getAllowance, getApproveEncode, getPriceOnOracle, getSwapFrom1InchApi, toPrintable } from '../../lib/utils';
// Types
import { CallData, Token } from '../../lib/types';
import TOKEN from '../../config/mainnet.json';
import { callFlashSwap, getFlashSwapGas, maxInt, printAccountBalance } from '../common';
import { flashSwap } from '../../lib/contracts';

const tokens: Token[] = [];
let maxBalance: string;

/**
 * Initialize token contracts.
 */
const initTokenContract = async () => {
    console.log('-------------------------------------------------------------------------------------------------------------------');
    console.log('-------------------------------------------------------------------------------------------------------------------');
    console.log(`Bot is running on ${network.yellow}. Initializing...`);
    console.log();
    
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
    const amountOut: BN[] = [];
    amountOut.push(inputAmount);
    const [a, b] = new BN(loanFee).toFraction();
    const feeAmount = inputAmount.times(a).idiv(b);
    let gas: BN = new BN(0), gasPrice: BN = new BN(0);
    for (let i = 0; i < tokens.length; i++) {
        let next = (i + 1) % tokens.length;
        let res = await getSwapFrom1InchApi(
            amountOut[i],
            tokens[i],
            tokens[next],
            network,
            flashSwap.options.address
        );
        if (res === null) return {};
        gas = new BN(res.tx.gas).times(res.tx.gasPrice);
        amountOut[i + 1] = new BN(res.toTokenAmount);
        let dexName = res.protocols[0][0][0].name;
        if (amountOut[i].gt(await getAllowance(tokens[i], flashSwap.options.address, res.tx.to)))
            tradeDatas.push([tokens[i].address, getApproveEncode(tokens[i], res.tx.to, maxInt)]);
        tradeDatas.push([res.tx.to, res.tx.data]);
        let toAmountPrint = toPrintable(amountOut[i + 1], tokens[next].decimals, fixed);
        let amountInPrint = toPrintable(amountOut[i], tokens[i].decimals, fixed);

        table.addRow({
            'Input Token': `${amountInPrint} ${tokens[i].symbol}`,
            [dexName]: `${toAmountPrint} ${tokens[next].symbol}`
            // 'Estimate Gas': `${gas} Gwei`
        });
    }
    
    table.printTable();
    // console.log(tradeDatas);
    const price = await getPriceOnOracle(tokens[0]);
    const profit = amountOut[tokens.length].minus(amountOut[0]).minus(feeAmount);
    const profitUSD = profit.times(price);
    const profitPrint = toPrintable(profit, tokens[0].decimals, fixed);
    const profitUSDPrint = toPrintable(profitUSD, tokens[0].decimals + 8, fixed);
    console.log(
        'Input:', toPrintable(inputAmount, tokens[0].decimals, fixed), tokens[0].symbol,
        '\tEstimate profit:', profit.gt(0) ? profitPrint.green : profitPrint.red, tokens[0].symbol,
        '($', profitUSD.gt(0) ? profitUSDPrint.green : profitUSDPrint.red, ')',
        // '\tEstimate gas:', await getFlashSwapGas(tokens[0].address, inputAmount, tradeDatas, flashSwap)
    );
    if (profit.gt(0)) {
        let response = await inquirer.prompt([{
            type: 'input',
            name: 'isExe',
            message: `Are you sure execute this trade? (yes/no)`
        }]);
        response.isExe === 'yes' && await callFlashSwap(tokens[0].address, inputAmount, tradeDatas, flashSwap);
    }
    console.log()
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