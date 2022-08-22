import BN from 'bignumber.js';
import { fixed, loanFee, web3 } from '../../lib/config';
import { Table } from 'console-table-printer';
import { Contract } from 'web3-eth-contract';
import { 
    bcQuoter,
    bcRouter,
    ddV1Helper,
    dfRouter, 
    fxRouter, 
    getDODOV1Pool, 
    getMooniPool, 
    lkRouter, 
    luRouter, 
    multicall, 
    shRouter, 
    smRouter, 
    suRouter, 
    un2Router, 
    un3Quoter, 
    un3Router 
} from '../../lib/contracts';
import { Multicall, Token } from '../../lib/types';
import { getPriceOnUniV2 } from '../../lib/uniswap/v2/getCalldata';
import { getPriceOnUniV3 } from '../../lib/uniswap/v3/getCalldata';
import { getPriceOnOracle, stripAnsiCodes, toPrintable } from '../../lib/utils';
import { getPriceOnMooni } from '../../lib/mooniswap/getCalldata';
import { getPriceOnBancorV3 } from '../../lib/bancor/getCalldata';
// import { getPriceOnUniV1 } from '../../lib/uniswap/v1/getCalldata';
import { getPriceOnSmoothy } from '../../lib/smoothy/getCalldata';
import { getPriceOnDODOV1 } from '../../lib/dodo/v1/getCalldata';

export const DEX = [
    'Uniswap_V2',
    'Sushiswap',
    'Shibaswap',
    'Defiswap',
    'Linkswap',
    'Fraxswap',
    'Luaswap'
]
/**
 * Calculate dexes quote.
 * @param amountIn Input amount of token.
 * @param tokenIn Input token address.
 * @param tokenOut Output token address.
 * @returns Array of quotes.
 */
export const getAllQuotes = async (amountIn: BN, path: string[]): Promise<[BN[], Contract[]]> => {
    const calls = [];
    const count = path.length;
    const uni2 = getPriceOnUniV2(amountIn, path, un2Router);
    const su = getPriceOnUniV2(amountIn, path, suRouter);
    const sh = getPriceOnUniV2(amountIn, path, shRouter);
    const df = getPriceOnUniV2(amountIn, path, dfRouter);
    const lk = getPriceOnUniV2(amountIn, path, lkRouter);
    const fx = getPriceOnUniV2(amountIn, path, fxRouter);
    const lu = getPriceOnUniV2(amountIn, path, luRouter);

    calls.push(
        [un2Router.options.address, uni2],
        [suRouter.options.address, su],
        [shRouter.options.address, sh],
        [dfRouter.options.address, df],
        [lkRouter.options.address, lk],
        [fxRouter.options.address, fx],
        [luRouter.options.address, lu]
    );
    const result: Multicall = await multicall.methods.tryAggregate(false, calls).call();
    const uni2Quote = result[0].success && result[0].returnData != '0x' ? new BN(web3.eth.abi.decodeParameter('uint256[]', result[0].returnData)[count- 1] as any) : new BN(-Infinity);
    const suQuote = result[1].success && result[1].returnData != '0x' ? new BN(web3.eth.abi.decodeParameter('uint256[]', result[1].returnData)[count- 1] as any) : new BN(-Infinity);
    const shQuote = result[2].success && result[2].returnData != '0x' ? new BN(web3.eth.abi.decodeParameter('uint256[]', result[2].returnData)[count- 1] as any) : new BN(-Infinity);
    const dfQuote = result[3].success && result[3].returnData != '0x' ? new BN(web3.eth.abi.decodeParameter('uint256[]', result[3].returnData)[count- 1] as any) : new BN(-Infinity);
    const lkQuote = result[4].success && result[4].returnData != '0x' ? new BN(web3.eth.abi.decodeParameter('uint256[]', result[4].returnData)[count- 1] as any) : new BN(-Infinity);
    const fxQuote = result[5].success && result[5].returnData != '0x' ? new BN(web3.eth.abi.decodeParameter('uint256[]', result[5].returnData)[count- 1] as any) : new BN(-Infinity);
    const luQuote = result[6].success && result[6].returnData != '0x' ? new BN(web3.eth.abi.decodeParameter('uint256[]', result[6].returnData)[count- 1] as any) : new BN(-Infinity);
    const quotes: BN[] = [
        uni2Quote, 
        suQuote, 
        shQuote, 
        dfQuote, 
        lkQuote, 
        fxQuote, 
        luQuote
    ];
    const routers: Contract[] = [
        un2Router, 
        suRouter, 
        shRouter, 
        dfRouter, 
        lkRouter, 
        fxRouter, 
        luRouter
    ];
    
    return [ quotes, routers ];
}
/**
 * Calculate and display the best profit path.
 * @param amountIn Start amount to trade.
 * @param tokenPath Array of tokens to trade.
 * @returns Return the best profit.
 */
export const calculateProfit = async (amountIn: BN, tokenPath: Token[]) => {
    const blockNumber = await web3.eth.getBlockNumber() + '';
    let tokenPathPrint = tokenPath.map(t => t.symbol).join(' -> ') + ' -> ' + tokenPath[0].symbol;
    let log = `Block: ${blockNumber.red.bold}\t\t${tokenPathPrint.yellow}`;
    console.log(log);
    log += '\n';
    const table = new Table();
    const [a, b] = new BN(loanFee).toFraction();
    const feeAmount = amountIn.times(a).idiv(b);
    const path = tokenPath.map(t => t.address);
    path.push(path[0]);
    const [amountOut,] = await getAllQuotes(amountIn, path);
    const maxAmountOut = BN.max(...amountOut);

    let amountInPrint: string = toPrintable(amountIn, tokenPath[0].decimals, fixed);
    let maxAmountPrint: string = toPrintable(maxAmountOut, tokenPath[0].decimals, fixed);

    for (let i = 0; i < amountOut.length; i++) {
        maxAmountOut.eq(amountOut[i]) && table.addRow({
            'Input Token': `${amountInPrint.yellow} ${tokenPath[0].symbol}`,
            [DEX[i]]: `${maxAmountPrint.yellow} ${tokenPath[0].symbol}`,
        });
    }
        
    
    const price = await getPriceOnOracle(tokenPath[0]);
    const profit = maxAmountOut.minus(amountIn).minus(feeAmount);
    const profitUSD = profit.times(price);
    const profitPrint = toPrintable(profit, tokenPath[0].decimals, fixed);
    const profitUSDPrint = toPrintable(profitUSD, tokenPath[0].decimals + 8, fixed);
    const profitLog = `Input: ${toPrintable(amountIn, tokenPath[0].decimals, fixed)} ${tokenPath[0].symbol}\t\tEstimate profit: ${profit.gt(0) ? profitPrint.green : profitPrint.red} ${tokenPath[0].symbol} ($${profitUSD.gt(0) ? profitUSDPrint.green : profitUSDPrint.red})\n`;
    if (profit.isFinite()) {
        table.printTable();
        console.log(profitLog);
    }
    
    log += profitLog;
    log += table.render() + '\n\n';
    log = stripAnsiCodes(log);
    return { table, profit, log };
}