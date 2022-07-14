import fs from 'fs';
import { web3, network, loanFee, fixed } from '../../lib/config';
import 'colors';
import { Table } from 'console-table-printer';
import BN from 'bignumber.js';
import { dfRouter, multicall, shRouter, suRouter, un2Router, un3Quoter } from '../../lib/contracts';
import { getPriceOnOracle, toPrintable } from '../../lib/utils';
import { getPriceOnUniV2 } from '../../lib/uniswap/v2/getCalldata';
import { getPriceOnUniV3 } from '../../lib/uniswap/v3/getCalldata';
import { getPriceOnOneSplit } from '../../lib/oneinch/onesplit/getCalldata';
import { getMooniSwap, getPriceOnMooni } from '../../lib/mooniswap/getCalldata';
// Types
import { Token, FileContent, Multicall } from '../../lib/types';

import TOKEN from '../../config/super_short.json';


/**
 * Calculate dexes quote.
 * @param amountIn Input amount of token.
 * @param tokenIn Input token address.
 * @param tokenOut Output token address.
 * @returns Array of quotes.
 */
 const getAllQuotes = async (amountIn: BN, tokenIn: string, tokenOut: string) => {
    const calls = [];
    // const msRouter = await getMooniSwap(tokenIn, tokenOut, mooniFactory, web3);
    // console.log(msRouter.options.address);
    const un3 = getPriceOnUniV3(amountIn, tokenIn, tokenOut);
    const un2 = getPriceOnUniV2(amountIn, tokenIn, tokenOut, un2Router);
    const su = getPriceOnUniV2(amountIn, tokenIn, tokenOut, suRouter);
    const sh = getPriceOnUniV2(amountIn, tokenIn, tokenOut, shRouter);
    const df = getPriceOnUniV2(amountIn, tokenIn, tokenOut, dfRouter);
    // const os = getPriceOnOneSplit(amountIn, tokenIn, tokenOut, osRouter);
    // const ms = getPriceOnMooni(amountIn, tokenIn, tokenOut, msRouter);
    // const bs = bsRouter.methods.queryBatchSwap();
    // const kb = kbQuoter.methods.quoteExactInputSingle({ tokenIn, tokenOut, feeUnits: 3000, amountIn: amountInString, limitSqrtP: '0' }).encodeABI();
    
    calls.push(
        [un3Quoter.options.address, un3],
        [un2Router.options.address, un2],
        [suRouter.options.address, su],
        [shRouter.options.address, sh],
        [dfRouter.options.address, df],
        // [osRouter.options.address, os],
        // [msRouter.options.address, ms]
    );

    const result: Multicall = await multicall.methods.tryAggregate(false, calls).call();
    const uni3Quote = result[0].success ? new BN(web3.eth.abi.decodeParameter('uint256', result[0].returnData) as any) : new BN(-Infinity);
    const uni2Quote = result[1].success ? new BN(web3.eth.abi.decodeParameter('uint256[]', result[1].returnData)[1] as any) : new BN(-Infinity);
    const suQuote = result[2].success ? new BN(web3.eth.abi.decodeParameter('uint256[]', result[2].returnData)[1] as any) : new BN(-Infinity);
    const shQuote = result[3].success ? new BN(web3.eth.abi.decodeParameter('uint256[]', result[3].returnData)[1] as any) : new BN(-Infinity);
    const dfQuote = result[4].success ? new BN(web3.eth.abi.decodeParameter('uint256[]', result[4].returnData)[1] as any) : new BN(-Infinity);
    // const osQuote = result[5].success ? new BN(web3.eth.abi.decodeParameter('uint256,uint256[]', result[5].returnData).returnAmount as any) : new BN(-Infinity);
    // const msQuote = result[6].success ? new BN(web3.eth.abi.decodeParameter('uint256', result[6].returnData) as any) : new BN(-Infinity);
    return [uni3Quote, uni2Quote, suQuote, shQuote, dfQuote];
}

/**
 * Calculate and display the best profit path.
 * @param amountIn Start amount to trade.
 * @param tokenPath Array of tokens to trade.
 * @returns Return the best profit.
 */
const calculateProfit = async (amountIn: BN, tokenPath: Token[]) => {
    console.log(tokenPath.map(t => t.symbol).join(' -> ') + ' -> ' + tokenPath[0].symbol);
    const table = new Table();
    const dexPath: number[] = [];
    const maxAmountOut: BN[] = [amountIn,];
    const amountOut: BN[][] = [];
    const [a, b] = new BN(loanFee).toFraction();
    const feeAmount = amountIn.times(a).idiv(b);

    for (let i = 0; i < tokenPath.length; i++) {
        let next = (i + 1) % tokenPath.length;
        if (!maxAmountOut[i].isFinite()) return{};
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

        table.addRow({
            'Input Token': `${amountIn} ${tokenPath[i].symbol}`,
            'UniSwapV3': `${amountPrint[0]} ${tokenPath[next].symbol}`,
            'UniSwapV2': `${amountPrint[1]} ${tokenPath[next].symbol}`,
            'SushiSwap': `${amountPrint[2]} ${tokenPath[next].symbol}`,
            'ShibaSwap': `${amountPrint[3]} ${tokenPath[next].symbol}`,
            'DefiSwap': `${amountPrint[4]} ${tokenPath[next].symbol}`,
            // 'Balancer': `${bsAmountPrint} ${tokenPath[next].symbol}`,
            // 'KyberSwap': `${kbAmountPrint} ${tokenPath[next].symbol}`
        });
    }
    const price = await getPriceOnOracle(tokenPath[0], TOKEN.USDT);
    const profit = maxAmountOut[tokenPath.length].minus(maxAmountOut[0]).minus(feeAmount);
    const profitUSD = profit.times(price); 
    if (profit.isFinite()) {
        table.printTable();
        console.log(
            'Input:',
            toPrintable(amountIn, tokenPath[0].decimals, fixed),
            tokenPath[0].symbol,
            '\tEstimate profit:',
            profit.gt(0) ?
                profit.div(new BN(10).pow(tokenPath[0].decimals)).toFixed(fixed).green :
                profit.div(new BN(10).pow(tokenPath[0].decimals)).toFixed(fixed).red,
            tokenPath[0].symbol,
            '($',
            profitUSD.gt(0) ?
                profitUSD.div(new BN(10).pow(tokenPath[0].decimals)).toFixed(fixed).green :
                profitUSD.div(new BN(10).pow(tokenPath[0].decimals)).toFixed(fixed).red,
            ')'
        );
    }
    return { profitUSD, table, dexPath };
}

/**
 * Bot start here.
 */
const main = async () => {
    const fileContent: FileContent = [];

    for (let i in TOKEN) {
        for (let j in TOKEN) {
            if (i === 'WETH' || 'WETH' === j || j === i) continue;
            let input = new BN(1).times(new BN(10).pow(TOKEN[i].decimals));
            let path = [TOKEN[i], TOKEN['WETH'], TOKEN[j]];
            let { profitUSD } = await calculateProfit(input, path);
            if (profitUSD && profitUSD.gt(0)) {
                fileContent.push({
                    path: path.map(t => t.symbol),
                    profit: '$' + profitUSD.div(new BN(10).pow(path[0].decimals)).toFixed(fixed)
                });
            }
        }
    }

    fileContent.sort((a, b) => {
        if (a.profit > b.profit) return -1;
        if (a.profit < b.profit) return 1;
        return 0;
    });

    fs.writeFileSync('output.json', JSON.stringify(fileContent));
}

main();