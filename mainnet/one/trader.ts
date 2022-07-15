import BN from 'bignumber.js';
import 'colors';
import inquirer from 'inquirer';
import { Table } from 'console-table-printer';
import { web3, account, network, loanFee, fixed } from '../../lib/config';
import { getPriceOnOracle, getSwapFrom1InchApi, toPrintable } from '../../lib/utils';
// Types
import { Token } from '../../lib/types';
import { Contract } from 'web3-eth-contract';

import { getMaxFlashAmount } from '../../lib/uniswap/v3/getCalldata';
import { flashSwap, getERC20Contract } from '../../lib/contracts';
import TOKEN from '../../config/mainnet.json';
import { callFlashSwap, printAccountBalance } from '../common';

let maxInputAmount: BN;
const tokens: Token[] = [];
const tokenContract: Contract[] = [];


/**
 * Call appoveToken function of flashswap contract.
 * @param flashswap Flashswap contract.
 * @param token Token to approve
 */
const approveToken = async (flashswap: Contract, token: Token) => {
    const method = flashswap.methods.approveToken(token.address);
    const encoded = method.encodeABI();

    const tx = {
        from: account.address,
        to: flashSwap.options.address,
        gas: 80000,
        data: encoded
    };
    const signedTx = await account.signTransaction(tx);

    const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction!);
    console.log(`Transaction hash: ${receipt.transactionHash}`);
}

/**
 * Check if 1inch router is approved to use asset of flashswap.
 */
const checkApproval = async () => {
    console.log('Checking allowance...');
    const promises = tokenContract.map(
        contract => contract.methods.allowance(
            process.env.MAINNET_CONTRACT_ADDRESS,
            process.env.ONEINCH_ROUTER_ADDRESS
        ).call()
    );
    const results: string[] = await Promise.all(promises);

    const minAmount = new BN('0xfffffffffffffffffffffff');
    const _token: Token[] = [];
    tokens.forEach((token, i) => {
        let result = new BN(results[i]);
        if (result.lt(minAmount)) {
            console.log(`Allowance of ${token.symbol.yellow} is not enough!`);
            _token.push(token);
        }
    });

    if (!_token.length) return;

    let response = await inquirer.prompt([{
        type: 'input',
        name: 'isExe',
        message: `Would you like to approve token? (yes/no)`
    }]);

    if (response.isExe !== 'yes') process.exit();

    for (let i = 0; i < _token.length; i++) await approveToken(flashSwap, _token[i]);
}

/**
 * Initialize token contracts.
 */
const initTokenContract = async () => {
    console.log('-------------------------------------------------------------------------------------------------------------------');
    console.log('-------------------------------------------------------------------------------------------------------------------');
    console.log(`Bot is running on ${network.yellow}. Initializing...`);
    console.log();
    
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
        let res = await getSwapFrom1InchApi(
            amountOut[i],
            tokens[i],
            tokens[next],
            network,
            flashSwap.options.address
        );
        console.log(res);
        if (res === null) return {};
        gas = new BN(res.tx.gas).times(res.tx.gasPrice);
        amountOut[i + 1] = new BN(res.toTokenAmount);
        let dexName = res.protocols[0][0][0].name;
        spenders.push(res.tx.to);
        routers.push(res.tx.to);
        tradeDatas.push(res.tx.data);
        let toAmountPrint = toPrintable(amountOut[i + 1], tokens[next].decimals, fixed);
        let amountInPrint = toPrintable(amountOut[i], tokens[i].decimals, fixed);

        table.addRow({
            'Input Token': `${amountInPrint} ${tokens[i].symbol}`,
            [dexName]: `${toAmountPrint} ${tokens[next].symbol}`
            // 'Estimate Gas': `${gas} Gwei`
        });
    }
    // console.log(tokenPath);
    // console.log([inputAmount.toFixed(), '0']);
    // console.log(routers);
    // console.log(tradeDatas);
    // table.addRow({'Estimate Gas': `${gas} Gwei`})
    table.printTable();

    const profit = amountOut[tokens.length].minus(amountOut[0]).minus(feeAmount);
    console.log(
        'Input:',
        toPrintable(inputAmount, tokens[0].decimals, fixed),
        tokens[0].symbol,
        '\tEstimate profit:',
        profit.gt(0) ?
            profit.div(new BN(10).pow(tokens[0].decimals)).toFixed(fixed).green :
            profit.div(new BN(10).pow(tokens[0].decimals)).toFixed(fixed).red,
        tokens[0].symbol
    );
    if (profit.gt(0)) {
        let response = await inquirer.prompt([{
            type: 'input',
            name: 'isExe',
            message: `Are you sure execute this trade? (yes/no)`
        }]);
        response.isExe === 'yes' && await callFlashSwap(tokenPath[0], inputAmount, tokenPath, spenders, routers, tradeDatas);
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
    // await checkApproval();
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