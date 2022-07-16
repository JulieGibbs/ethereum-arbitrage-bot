import BN from 'bignumber.js';
import 'colors';
import inquirer from 'inquirer';
import { Table } from 'console-table-printer';
import { network, loanFee, fixed } from '../../lib/config';
import { getPriceOnOracle, getSwapFromZeroXApi, toPrintable } from '../../lib/utils';
// Types
import { Token } from '../../lib/types';
import { Contract } from 'web3-eth-contract';
import TOKEN from '../../config/mainnet.json';
import { callFlashSwap, printAccountBalance } from '../common';

const tokens: Token[] = [];
let maxInputAmount: BN;

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
    const amountOut: BN[] = [];
    amountOut.push(inputAmount);
    const [a, b] = new BN(loanFee).toFraction();
    const feeAmount = inputAmount.times(a).idiv(b);
    let gas: BN = new BN(0), gasPrice: BN = new BN(0);
    for (let i = 0; i < tokens.length; i++) {
        let next = (i + 1) % tokens.length;
        let res = await getSwapFromZeroXApi(
            amountOut[i],
            tokens[i],
            tokens[next],
            network,
        );
        if (res === null) return {};
        gas = new BN(res.gas).times(new BN(res.gasPrice));
        amountOut[i + 1] = new BN(res.buyAmount);
        let dexName = res.orders[0].source;
        spenders.push(res.allowanceTarget);
        routers.push(res.to);
        tradeDatas.push(res.data);
        let toAmountPrint = toPrintable(amountOut[i + 1], tokens[next].decimals, fixed);
        let amountInPrint = toPrintable(amountOut[i], tokens[i].decimals, fixed);

        table.addRow({
            'Input Token': `${amountInPrint} ${tokens[i].symbol}`,
            [dexName]: `${toAmountPrint} ${tokens[next].symbol}`
            // 'Estimate Gas': `${gas} Gwei`
        });
    }
 
    table.printTable();

    const price = await getPriceOnOracle(tokens[0]);
    const profit = amountOut[tokens.length].minus(amountOut[0]).minus(feeAmount);
    const profitUSD = profit.times(price);
    const profitPrint = toPrintable(profit, tokens[0].decimals, fixed);
    const profitUSDPrint = toPrintable(profitUSD, tokens[0].decimals + 8, fixed);
    console.log(
        'Input:', toPrintable(inputAmount, tokens[0].decimals, fixed), tokens[0].symbol,
        '\tEstimate profit:', profit.gt(0) ? profitPrint.green : profitPrint.red, tokens[0].symbol,
        '($', profitUSD.gt(0) ? profitUSDPrint.green : profitUSDPrint.red, ')'
    );
    if (profit.gt(0)) {
        let response = await inquirer.prompt([{
            type: 'input',
            name: 'isExe',
            message: `Are you sure execute this trade? (yes/no)`
        }]);
        response.isExe === 'yes' && await callFlashSwap(tokenPath[0], inputAmount, tokenPath, spenders, routers, tradeDatas);
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
        if (maxInputAmount == undefined || new BN(input).gt(maxInputAmount)) {
            console.log("Input exceed Max Loan Amount!".red);
            continue;
        }
        await runBot(new BN(input).times(new BN(10).pow(tokens[0].decimals)));
    }
}

main();