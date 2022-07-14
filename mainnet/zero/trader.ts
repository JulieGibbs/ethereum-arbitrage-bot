import BN from 'bignumber.js';
import 'colors';
import inquirer from 'inquirer';
import { Table } from 'console-table-printer';
import { web3, account, network, loanFee, fixed } from '../../lib/config';
import { getPriceOnOracle, getSwapFromZeroXApi, toPrintable } from '../../lib/utils';
// Types
import { Token } from '../../lib/types';
import { Contract } from 'web3-eth-contract';

import { getMaxFlashAmount } from '../../lib/uniswap/v3/getCalldata';
import { flashSwap, getERC20Contract } from '../../lib/contracts';
import TOKEN from '../../config/mainnet.json';

const tokens: Token[] = [];
const tokenContract: Contract[] = [];
let maxInputAmount: BN;
/**
 * Print balance of wallet.
 */
const printAccountBalance = async () => {
    const table = new Table();
    const row = { 'Token': 'Balance' };

    let ethBalance = await web3.eth.getBalance(account.address);
    row['ETH'] = toPrintable(new BN(ethBalance), 18, fixed);

    let promises = tokens.map((t, i) => tokenContract[i].methods.balanceOf(account.address).call());
    let balances: string[] = await Promise.all(promises);
    balances.forEach((bal, i) => {
        row[tokens[i].symbol] = toPrintable(new BN(bal), tokens[i].decimals, fixed);
    });
    table.addRow(row);
    table.printTable();
    maxInputAmount = await getMaxFlashAmount(tokenContract[0]);
    if (maxInputAmount !== undefined)
        console.log(`Max flash loan amount of ${tokens[0].symbol} is ${toPrintable(maxInputAmount, tokens[0].decimals, fixed)}`)
    console.log('-------------------------------------------------------------------------------------------------------------------');
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
    const nonce = await web3.eth.getTransactionCount(account.address);
    const tx = {
        from: account.address,
        to: flashSwap.options.address,
        nonce: nonce,
        gas: 2000000,
        data: init.encodeABI()
    };
    const signedTx = await account.signTransaction(tx);

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
        tokenContract.push(getERC20Contract(_token.address));
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

    const price = await getPriceOnOracle(tokens[0], TOKEN.USDT);
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