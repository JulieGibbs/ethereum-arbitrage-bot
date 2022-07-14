import * as dotenv from 'dotenv';
import { web3, network, account, loanFee, fixed } from '../../lib/config';
import 'colors';
import inquirer from 'inquirer';
import { Table } from 'console-table-printer';
import BN from 'bignumber.js';
import { dfRouter, flashFactory, flashSwap, getERC20Contract, multicall, shRouter, suRouter, un2Router, un3Quoter, un3Router } from '../../lib/contracts';
import { getPriceOnOracle, toPrintable } from '../../lib/utils';
import { getPriceOnUniV2, getSwapOnUniV2 } from '../../lib/uniswap/v2/getCalldata';
import { getPriceOnUniV3, getSwapOnUniv3, getMaxFlashAmount } from '../../lib/uniswap/v3/getCalldata';

// Types
import { Token, Multicall } from '../../lib/types';
import { Contract } from 'web3-eth-contract';

import TOKEN from '../../config/mainnet.json';

dotenv.config({ path: __dirname + '/../../.env' });

let maxInputAmount: BN;


const tokens: Token[] = [];
const tokenContract: Contract[] = [];

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
 * Calculate dexes quote.
 * @param amountIn Input amount of token.
 * @param tokenIn Input token address.
 * @param tokenOut Output token address.
 * @returns Array of quotes.
 */
const getAllQuotes = async (amountIn: BN, tokenIn: string, tokenOut: string) => {
    const calls = [];
    const amountInString = amountIn.toFixed();

    const un3 = getPriceOnUniV3(amountIn, tokenIn, tokenOut);
    const un2 = getPriceOnUniV2(amountIn, tokenIn, tokenOut, un2Router);
    const su = getPriceOnUniV2(amountIn, tokenIn, tokenOut, suRouter);
    const sh = getPriceOnUniV2(amountIn, tokenIn, tokenOut, shRouter);
    const df = getPriceOnUniV2(amountIn, tokenIn, tokenOut, dfRouter);

    calls.push(
        [un3Quoter.options.address, un3],
        [un2Router.options.address, un2],
        [suRouter.options.address, su],
        [shRouter.options.address, sh],
        [dfRouter.options.address, df]
    );

    const result: Multicall = await multicall.methods.tryAggregate(false, calls).call();
    const un3Quote = result[0].success ? new BN(web3.eth.abi.decodeParameter('uint256', result[0].returnData) as any) : new BN(-Infinity);
    const un2Quote = result[1].success ? new BN(web3.eth.abi.decodeParameter('uint256[]', result[1].returnData)[1] as any) : new BN(-Infinity);
    const suQuote = result[2].success ? new BN(web3.eth.abi.decodeParameter('uint256[]', result[2].returnData)[1] as any) : new BN(-Infinity);
    const shQuote = result[3].success ? new BN(web3.eth.abi.decodeParameter('uint256[]', result[3].returnData)[1] as any) : new BN(-Infinity);
    const dfQuote = result[4].success ? new BN(web3.eth.abi.decodeParameter('uint256[]', result[4].returnData)[1] as any) : new BN(-Infinity);
    return [un3Quote, un2Quote, suQuote, shQuote, dfQuote];
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
    const init = flashFactory.methods.initUniFlashSwap(
        loanTokens,
        loanAmounts,
        tokenPath,
        spenders,
        routers,
        tradeDatas
    );
    const tx = {
        from: account.address,
        to: flashSwap.options.address,
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
    const dexPath: number[] = [];
    const tokenPath: string[] = tokens.map(_token => _token.address);
    const spenders: string[] = [];
    const routers: string[] = [];
    const tradeDatas: string[] = [];
    const maxAmountOut: BN[] = [inputAmount,];
    const amountOut: BN[][] = [];

    const [a, b] = new BN(loanFee).toFraction();
    const feeAmount = inputAmount.times(a).idiv(b);

    for (let i = 0; i < tokens.length; i++) {
        let next = (i + 1) % tokens.length;

        amountOut[i] = await getAllQuotes(maxAmountOut[i], tokens[i].address, tokens[next].address);
        maxAmountOut[i + 1] = BN.max(...amountOut[i]);
        let amountIn: string = toPrintable(maxAmountOut[i], tokens[i].decimals, fixed);
        let amountPrint: string[] = amountOut[i].map(out => toPrintable(out, tokens[next].decimals, fixed));

        if (maxAmountOut[i + 1].eq(amountOut[i][0])) {
            amountPrint[0] = amountPrint[0].underline;
            spenders.push(un3Router.options.address);
            routers.push(un3Router.options.address);
            tradeDatas.push(getSwapOnUniv3(maxAmountOut[i], maxAmountOut[i + 1], [tokens[i].address, tokens[next].address], flashSwap.options.address));
        }
        else if (maxAmountOut[i + 1].eq(amountOut[i][1])) {
            amountPrint[1] = amountPrint[1].underline;
            spenders.push(un2Router.options.address);
            routers.push(un2Router.options.address);
            tradeDatas.push(getSwapOnUniV2(maxAmountOut[i], maxAmountOut[i + 1], [tokens[i].address, tokens[next].address], flashSwap.options.address, un2Router));
        }
        else if (maxAmountOut[i + 1].eq(amountOut[i][2])) {
            amountPrint[2] = amountPrint[2].underline;
            spenders.push(suRouter.options.address);
            routers.push(suRouter.options.address);
            tradeDatas.push(getSwapOnUniV2(maxAmountOut[i], maxAmountOut[i + 1], [tokens[i].address, tokens[next].address], flashSwap.options.address, suRouter));
        }
        else if (maxAmountOut[i + 1].eq(amountOut[i][3])) {
            amountPrint[3] = amountPrint[3].underline;
            spenders.push(shRouter.options.address);
            routers.push(shRouter.options.address);
            tradeDatas.push(getSwapOnUniV2(maxAmountOut[i], maxAmountOut[i + 1], [tokens[i].address, tokens[next].address], flashSwap.options.address, shRouter));
        }
        else if (maxAmountOut[i + 1].eq(amountOut[i][4])) {
            amountPrint[4] = amountPrint[4].underline;
            spenders.push(dfRouter.options.address);
            routers.push(dfRouter.options.address);
            tradeDatas.push(getSwapOnUniV2(maxAmountOut[i], maxAmountOut[i + 1], [tokens[i].address, tokens[next].address], flashSwap.options.address, dfRouter));
        }
        
        table.addRow({
            'Input Token': `${amountIn} ${tokens[i].symbol}`,
            'UniSwapV3': `${amountPrint[0]} ${tokens[next].symbol}`,
            'UniSwapV2': `${amountPrint[1]} ${tokens[next].symbol}`,
            'SushiSwap': `${amountPrint[2]} ${tokens[next].symbol}`,
            'ShibaSwap': `${amountPrint[3]} ${tokens[next].symbol}`,
            'DefiSwap': `${amountPrint[4]} ${tokens[next].symbol}`
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
        response.isExe === 'yes' && await callFlashSwap(tokenPath[0], inputAmount, tokenPath, spenders, routers, tradeDatas);
    }

}
const calculateProfit = async (amountIn: BN, tokenPath: Token[]) => {
    const dexPath: number[] = [];
    const maxAmountOut: BN[] = [amountIn,];
    const amountOut: BN[][] = [];
    const [a, b] = new BN(loanFee).toFraction();
    const feeAmount = amountIn.times(a).idiv(b);

    for (let i = 0; i < tokenPath.length; i++) {
        let next = (i + 1) % tokenPath.length;
        amountOut[i] = await getAllQuotes(maxAmountOut[i], tokenPath[i].address, tokenPath[next].address);
        maxAmountOut[i + 1] = BN.max(...amountOut[i]);
        let amountIn: string = toPrintable(maxAmountOut[i], tokenPath[i].decimals, fixed);
        let amountPrint: string[] = amountOut[i].map(out => toPrintable(out, tokenPath[next].decimals, fixed));

        if (maxAmountOut[i + 1].eq(amountOut[i][0])) {
            amountPrint[0] = amountPrint[0].underline;
        }
        else if (maxAmountOut[i + 1].eq(amountOut[i][1])) {
            amountPrint[1] = amountPrint[1].underline;
        }
        else if (maxAmountOut[i + 1].eq(amountOut[i][2])) {
            amountPrint[2] = amountPrint[2].underline;
        }
        else if (maxAmountOut[i + 1].eq(amountOut[i][3])) {
            amountPrint[3] = amountPrint[3].underline;
        }
        else if (maxAmountOut[i + 1].eq(amountOut[i][4])) {
            amountPrint[4] = amountPrint[4].underline;
        }
        // else if (maxAmountOut[i + 1].eq(amountOut[i][5])) {
        //     amountPrint[5] = amountPrint[5].underline;
        // }
        // else if (maxAmountOut[i + 1].eq(amountOut[i][6])) {
        //     amountPrint[6] = amountPrint[6].underline;
        // }

    }
    
    const profit = maxAmountOut[tokenPath.length].minus(maxAmountOut[0]).minus(feeAmount);
    
    
    return { profit, dexPath };
}
const getOptiInput = () => {

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