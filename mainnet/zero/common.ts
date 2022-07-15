import BN from 'bignumber.js';
import { Table } from 'console-table-printer';
import { fixed, loanFee, network } from '../../lib/config';
import { Token } from '../../lib/types';
import TOKEN from '../../config/mainnet.json';
import { getPriceOnOracle, getSwapFromZeroXApi, toPrintable } from '../../lib/utils';
export const calculateProfit = async (amountIn: BN, tokenPath: Token[]) => {
    console.log(tokenPath.map(t => t.symbol).join(' -> ') + ' -> ' + tokenPath[0].symbol);
    const table = new Table();
    const dexPath: number[] = [];
    let amountOut: BN[] = [], gas = 0;

    amountOut.push(amountIn);

    const [a, b] = new BN(loanFee).toFraction();
    const feeAmount = amountOut[0].times(a).idiv(b);

    for (let i = 0; i < tokenPath.length; i++) {
        let next = (i + 1) % tokenPath.length;
        if (!amountOut[i].isFinite()) return{};
        let res = await getSwapFromZeroXApi(
            amountOut[i],
            tokenPath[i],
            tokenPath[next],
            network
        );
        if (res === null) return {};
        gas += parseInt(res.gas);
        amountOut[i + 1] = new BN(res.buyAmount);
        let amountInPrint = toPrintable(amountOut[i], tokenPath[i].decimals, fixed);
        let toAmountPrint = toPrintable(amountOut[i + 1], tokenPath[next].decimals, fixed);
        let dexName = res.orders[0].source;

        table.addRow({
            'Input Token': `${amountInPrint} ${tokenPath[i].symbol}`,
            [dexName]: `${toAmountPrint} ${tokenPath[next].symbol}`
        });
    }
    const price = await getPriceOnOracle(tokenPath[0], TOKEN.USDT);
    const profit = amountOut[tokenPath.length].minus(amountIn).minus(feeAmount);
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
            ')',
            '\tEstimate gas:',
            gas,
            '\n'
        );
    }
    return { profitUSD, table, dexPath };
}
