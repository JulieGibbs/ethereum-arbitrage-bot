import * as dotenv from 'dotenv';
import fs from 'fs';
import Web3 from 'web3';
import 'colors';
import { Table } from 'console-table-printer';
import BN from 'bignumber.js';
import { getSwapFromZeroXApi, toPrintable } from '../../lib/utils';
import { getPriceOnUniV2 } from '../../lib/uniswap/v2/getCalldata';
import { getPriceOnUniV3 } from '../../lib/uniswap/v3/getCalldata';
import { getPriceOnOneSplit } from '../../lib/oneinch/onesplit/getCalldata';
import { getMooniSwap, getPriceOnMooni } from '../../lib/mooniswap/getCalldata';
// Types
import { Token, Network, FileContent, Multicall } from '../../lib/types';
import { AbiItem } from 'web3-utils';

import TOKEN from '../../config/super_short.json';
import DEX from '../../config/dexs.json';

// ABIs
import un3IQuoter from '../../abi/UniswapV3IQuoter.json';
import un2IRouter from '../../abi/UniswapV2Router02.json';
import shIRouter from '../../abi/UniswapV2Router02.json';
import dfIRouter from '../../abi/UniswapV2Router02.json';
import osIRouter from '../../abi/OneSplit.json';
import msIFactory from '../../abi/MooniFactory.json';
// import bsIRouter from '../abi/BalancerVault.json';
// import kbIQuoter from '../abi/KyberQuoter.json';

import IMulticall from '../../abi/UniswapV3Multicall2.json';

dotenv.config({ path: __dirname + '/../.env' });

/**
 * The network on which the bot runs.
 */
const network: Network = 'mainnet';

/**
 * Flashloan fee.
 */
const loanFee = 0.0005;

/**
 * Token price floating-point digit.
 */
const fixed = 4;

const web3 = new Web3(`https://${network}.infura.io/v3/${process.env.INFURA_KEY}`);

const un3Quoter = new web3.eth.Contract(un3IQuoter.abi as AbiItem[], DEX[network].UniswapV3.Quoter);
const un2Router = new web3.eth.Contract(un2IRouter.abi as AbiItem[], DEX[network].UniswapV2.Router);
const suRouter = new web3.eth.Contract(un2IRouter.abi as AbiItem[], DEX[network].SushiswapV2.Router);
const shRouter = new web3.eth.Contract(shIRouter.abi as AbiItem[], DEX[network].ShibaswapV2.Router);
const dfRouter = new web3.eth.Contract(dfIRouter.abi as AbiItem[], DEX[network].DefiSwap.Router);
// const mooniFactory = new web3.eth.Contract(msIFactory.abi as AbiItem[], DEX[network].MooniSwap.Factory);
// const osRouter = new web3.eth.Contract(osIRouter.abi as AbiItem[], DEX[network].OneSlpit.Router);
// const bsRouter = new web3.eth.Contract(bsIRouter.abi as AbiItem[], DEX[network].Balancerswap.Vault);
// const kbQuoter = new web3.eth.Contract(kbIQuoter.abi as AbiItem[], DEX[network].Kyberswap.Quoter);

const multicall = new web3.eth.Contract(IMulticall as AbiItem[], DEX[network].UniswapV3.Multicall2);

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
    const un3 = getPriceOnUniV3(amountIn, tokenIn, tokenOut, un3Quoter);
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
    let res = tokenPath[0].symbol != TOKEN.DAI.symbol ? await getSwapFromZeroXApi(
        amountIn,
        tokenPath[0].address,
        TOKEN.DAI.address,
        network
    ) : null;
    const price = tokenPath[0].symbol != TOKEN.DAI.symbol ? new BN(res.price) : new BN(1);
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