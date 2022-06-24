import * as dotenv from 'dotenv';
import Web3 from 'web3';
import 'colors';
import inquirer from 'inquirer';
import { Table } from 'console-table-printer';
import BN from 'bignumber.js';
import { getUniswapQuote, getUniswapV3Quote, toPrintable } from './lib/utils';

// Types
import { Token, Network } from './lib/types';
import { AbiItem } from 'web3-utils';
import { Contract } from 'web3-eth-contract';

import TOKEN from './config/testTokens.json';
import DEX from './config/dex.json';

// ABIs
import IContract from './abi/UniswapFlash.json';
import un3IQuoter from './abi/UniswapV3IQuoter.json';
import un2IRouter from './abi/IUniswapV2Router02.json';
import IERC20 from './abi/IERC20.json';

dotenv.config();

/**
 * The network on which the bot runs.
 */
const network: Network = 'kovan';

/**
 * Initial amount of token.
 */
// const initial = 1;

/**
 * Flashloan fee.
 */
const loanFee = 0.0005;

/**
 * Token price floating-point digit.
 */
const fixed = 4;

const web3 = new Web3(`https://${network}.infura.io/v3/${process.env.INFURA_KEY}`);
const account = web3.eth.accounts.privateKeyToAccount(process.env.PRIVATE_KEY!).address;
const flashSwapContract = new web3.eth.Contract(IContract.abi as AbiItem[], process.env.MAINNET_CONTRACT_ADDRESS);

const un3Quoter = new web3.eth.Contract(un3IQuoter.abi as AbiItem[], DEX[network].UniswapV3.Quoter);
const un2Router = new web3.eth.Contract(un2IRouter.abi as AbiItem[], DEX[network].UniswapV2.Router);

const tokens: Token[] = [];
const tokenContract: Contract[] = [];

/**
 * Print balance of wallet.
 */
const printAccountBalance = async () => {
    const table = new Table();
    const row = { 'Token': 'Balance' };

    let ethBalance = await web3.eth.getBalance(account);
    row['ETH'] = toPrintable(new BN(ethBalance), 18, fixed);

    let promises = tokens.map((t, i) => tokenContract[i].methods.balanceOf(account).call());
    let balances: string[] = await Promise.all(promises);
    balances.forEach((bal, i) => {
        row[tokens[i].symbol] = toPrintable(new BN(bal), tokens[i].decimals, fixed);
    });

    table.addRow(row);
    table.printTable();
    console.log('-------------------------------------------------------------------------------------------------------------------');
}

/**
 * Swap tokens on contract.
 * @param loanToken Address of token to loan.
 * @param loanAmount Loan amount of token.
 * @param tradePath Array of address to trade.
 * @param dexPath Array of dex index.
 */
const callFlashSwap = async (loanToken: string, loanAmount: BN, tradePath: string[], dexPath: number[]) => {
    console.log('Swapping ...');
    let otherToken = loanToken === TOKEN[network].WETH.address ? TOKEN[network].DAI.address : TOKEN[network].WETH.address;
    const init = flashSwapContract.methods.initUniFlashSwap(
        [loanToken, otherToken],
        [loanAmount.toFixed(), '0'],
        tradePath,
        dexPath
    );
    const tx = {
        from: account,
        to: flashSwapContract.options.address,
        gas: 2000000,
        data: init.encodeABI()
    };
    const signedTx = await web3.eth.accounts.signTransaction(tx, process.env.PRIVATE_KEY!);

    try {
        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction!);
        console.log('Completed. Transaction hash:', receipt.transactionHash);
    }
    catch (err) {
        console.log(err);
    }
}

/**
 * Initialize token contracts.
 */
const initTokenContract = async () => {
    console.log('-------------------------------------------------------------------------------------------------------------------');
    console.log('-------------------------------------------------------------------------------------------------------------------');
    console.log(`Bot is running on ${network.yellow}. Initializing...`);
    console.log();
    // Initialize token contracts and decimals.
    tokens.forEach((_token) => {
        tokenContract.push(new web3.eth.Contract(IERC20.abi as AbiItem[], _token.address));
    });

    await printAccountBalance();
}

/**
 * Calculate trade result.
 * @param inputAmount Start amount of trade.
 * @returns ```[profit, table, dexPath, tokenPath]```
 */
const runBot = async (inputAmount: BN) => {
    const table = new Table();
    const dexPath: number[] = [];
    const tokenPath = tokens.map(_token => _token.address);
    tokenPath.push(tokenPath.shift()!);

    const amountOut: BN[] = [], un2AmountOut: BN[] = [], un3AmountOut: BN[] = [], suAmountOut: BN[] = [];
    amountOut[0] = un2AmountOut[0] = un3AmountOut[0] = suAmountOut[0] = inputAmount;

    const [a, b] = new BN(loanFee).toFraction();
    const feeAmount = amountOut[0].times(a).idiv(b);

    for (let i = 0; i < tokens.length; i++) {
        let next = (i + 1) % tokens.length;

        [un2AmountOut[i + 1], un3AmountOut[i + 1], suAmountOut[i + 1]] = await Promise.all([
            getUniswapQuote(amountOut[i], tokenContract[i].options.address, tokenContract[next].options.address, un2Router),
            getUniswapV3Quote(amountOut[i], tokenContract[i].options.address, tokenContract[next].options.address, un3Quoter),
            getUniswapQuote(amountOut[i], tokenContract[i].options.address, tokenContract[next].options.address, un2Router)
        ]);
        amountOut[i + 1] = BN.max(un2AmountOut[i + 1], un3AmountOut[i + 1], suAmountOut[i + 1]);
        let amountIn = toPrintable(amountOut[i], tokens[i].decimals, fixed);

        let un2AmountPrint = toPrintable(un2AmountOut[i + 1], tokens[next].decimals, fixed);
        let un3AmountPrint = toPrintable(un3AmountOut[i + 1], tokens[next].decimals, fixed);
        let suAmountPrint = toPrintable(suAmountOut[i + 1], tokens[next].decimals, fixed);

        if (amountOut[i + 1].eq(un2AmountOut[i + 1])) {
            un2AmountPrint = un2AmountPrint.underline;
            dexPath.push(DEX[network].UniswapV2.id);
        }
        else if (amountOut[i + 1].eq(un3AmountOut[i + 1])) {
            un3AmountPrint = un3AmountPrint.underline;
            dexPath.push(DEX[network].UniswapV3.id);
        }
        else if (amountOut[i + 1].eq(suAmountOut[i + 1])) {
            suAmountPrint = suAmountPrint.underline;
            dexPath.push(DEX[network].SushiswapV2.id);
        }
        else dexPath.push(0);

        table.addRow({
            'Input Token': `${amountIn} ${tokens[i].symbol}`,
            'UniSwapV3': `${un3AmountPrint} ${tokens[next].symbol}`,
            'UniSwapV2': `${un2AmountPrint} ${tokens[next].symbol}`,
            'SushiSwap': `${suAmountPrint} ${tokens[next].symbol}`
        });
    }

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
        response.isExe === 'yes' && await callFlashSwap(tokens[0].address, inputAmount, tokenPath, dexPath);
    }

    console.log();
    return [profit, table, dexPath, tokenPath];
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
        await runBot(new BN(response.input).times(new BN(10).pow(tokens[0].decimals)));
    }
}

main();