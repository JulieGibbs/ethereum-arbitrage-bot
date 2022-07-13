import * as dotenv from 'dotenv';
import Web3 from 'web3';
import 'colors';
import inquirer from 'inquirer';
import { Table } from 'console-table-printer';
import BN from 'bignumber.js';
import { getSwapFromZeroXApi, toPrintable } from '../../lib/utils';
// Types
import { Token, Network, Multicall } from '../../lib/types';
import { AbiItem } from 'web3-utils';
import { Contract } from 'web3-eth-contract';

import TOKEN from '../../config/mainnet.json';

// ABIs
import IContract from '../../abi/UniswapFlash.json';
import IERC20 from '../../abi/ERC20.json';
import IUniV3Factory from '../../abi/UniswapV3Factory.json';
dotenv.config({ path: __dirname + '/../../.env' });

/**
 * The network on which the bot runs.
 */
const network: Network = 'mainnet';

/**
 * Initial amount of token.
 */
// const initial = 1;
let maxInputAmount;
/**
 * Flashloan fee.
 */
const loanFee = 0.0005;

/**
 * Token price floating-point digit.
 */
const fixed = 4;

const web3 = new Web3(`https://${network}.infura.io/v3/${process.env.INFURA_KEY}`);
// const web3 = new Web3('http://127.0.0.1:7545');
const account = web3.eth.accounts.privateKeyToAccount(process.env.PRIVATE_KEY!).address;
const flashSwap = new web3.eth.Contract(IContract.abi as AbiItem[], process.env.MAINNET_CONTRACT_ADDRESS);
const flashFactory = new web3.eth.Contract(IUniV3Factory.abi as AbiItem[], process.env.UNIV3FACTORY);
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
    maxInputAmount = await maxFlashamount();
    if (maxInputAmount !== undefined)
        console.log(`Max flash loan amount of ${tokens[0].symbol} is ${toPrintable(maxInputAmount, tokens[0].decimals, fixed)}`)
    console.log('-------------------------------------------------------------------------------------------------------------------');
}

const maxFlashamount = async () => {
    let otherToken = tokens[0].address === TOKEN.WETH.address ? TOKEN.DAI.address : TOKEN.WETH.address;

    try {
        const flashPool = await flashFactory.methods.getPool(tokens[0].address, otherToken, 500).call();
        const balance = await tokenContract[0].methods.balanceOf(flashPool).call();
        const maxAmount = balance ? new BN(balance) : new BN(0);
        return maxAmount;
    } catch (err){
        console.log('Flash pool is not exist!');
        // return {};
    }
}
/**
 * Swap tokens on contract.
 * @param loanToken Address of token to loan.
 * @param loanAmount Loan amount of token.
 * @param tradePath Array of address to trade.
 * @param dexPath Array of dex index.
 */
const callFlashSwap = async (loanToken: string, loanAmount: BN, tokenPath: string[], spenders: string[], routers: string[], tradeDatas: string[]) => {
    console.log('Swapping ...');
    if (tokenPath.length != routers.length || tokenPath.length != tradeDatas.length) {
        console.log('Swap data is not correct!')
        return {};
    }
    const loanTokens = loanToken === TOKEN.WETH.address ? [TOKEN.DAI.address, loanToken] : [loanToken, TOKEN.WETH.address];
    const loanAmounts = loanToken === TOKEN.WETH.address ? ['0', loanAmount.toFixed()] : [loanAmount.toFixed(), '0']
    const init = flashSwap.methods.initUniFlashSwap(
        loanTokens,
        loanAmounts,
        tokenPath,
        spenders,
        routers,
        tradeDatas
    );
    const nonce = await web3.eth.getTransactionCount(account);
    const tx = {
        from: account,
        to: flashSwap.options.address,
        nonce: nonce,
        gas: 2000000,
        data: init.encodeABI()
    };
    const signedTx = await web3.eth.accounts.signTransaction(tx, process.env.PRIVATE_KEY!);

    try {
        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction!);
        console.log(`Transaction hash: https://etherscan.io/tx/${receipt.transactionHash}`);
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

    let res = tokens[0].symbol != TOKEN.DAI.symbol ? await getSwapFromZeroXApi(
        inputAmount,
        tokens[0],
        TOKEN.DAI,
        network
    ) : null;
    const price = tokens[0].symbol != TOKEN.DAI.symbol ? new BN(res.price) : new BN(1);
    const profit = amountOut[tokenPath.length].minus(inputAmount).minus(feeAmount);
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
    while (true) {
        let response = await inquirer.prompt([{
            type: 'input',
            name: 'input',
            message: `Please input ${tokens[0].symbol} amount:`
        }]);
        let input = parseFloat(response.input);
        if (isNaN(input) || input <= 0) continue;
        if (new BN(input).gt(maxInputAmount)) {
            console.log("Input exceed Max Loan Amount!".red);
            continue;
        }
        await runBot(new BN(input).times(new BN(10).pow(tokens[0].decimals)));
    }
}

main();