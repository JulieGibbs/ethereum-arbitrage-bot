import BN from 'bignumber.js';
import { Table } from 'console-table-printer';
import { fixed, loanFee, network, web3 } from '../../lib/config';
import { flashSwap } from '../../lib/contracts';
import { Token } from '../../lib/types';
import { getPriceFrom1InchApi, getPriceOnOracle, getSwapFrom1InchApi, stripAnsiCodes, toPrintable } from '../../lib/utils';
export const calculateProfit = async (amountIn: BN, tokenPath: Token[]) => {
    const blockNumber = await web3.eth.getBlockNumber() + '';
    let tokenPathPrint = tokenPath.map(t => t.symbol).join(' -> ') + ' -> ' + tokenPath[0].symbol;
    let log = `Block: ${blockNumber.red.bold}\t\t${tokenPathPrint.yellow}`;
    console.log(log);
    log += '\n';
    
    const table = new Table();
    const dexPath: number[] = [];
    let amountOut: BN[] = [], gas: BN = new BN(0)

    amountOut.push(amountIn);

    const [a, b] = new BN(loanFee).toFraction();
    const feeAmount = amountOut[0].times(a).idiv(b);

    for (let i = 0; i < tokenPath.length; i++) {
        let next = (i + 1) % tokenPath.length;
        if (!amountOut[i].isFinite()) return{};
        let res = await getSwapFrom1InchApi(
            amountOut[i],
            tokenPath[i],
            tokenPath[next],
            network,
            flashSwap.options.address
        );

        if (res === null) return {};
        gas = gas.plus(new BN(res.tx.gas).times(new BN(res.tx.gasPrice)).plus(new BN(res.tx.value)));
        amountOut[i + 1] = new BN(res.toTokenAmount);
        let dexName = res.protocols[0][0][0].name;
        let amountInPrint = toPrintable(amountOut[i], tokenPath[i].decimals, fixed);
        let toAmountPrint = toPrintable(amountOut[i + 1], tokenPath[next].decimals, fixed);
        table.addRow({
            'Input Token': `${amountInPrint} ${tokenPath[i].symbol}`,
            [dexName]: `${toAmountPrint} ${tokenPath[next].symbol}`
        });
    }

    const price = await getPriceOnOracle(tokenPath[0]);
    const profit = amountOut[tokenPath.length].minus(amountOut[0]).minus(feeAmount);
    const profitUSD = profit.times(price);
    const profitPrint = toPrintable(profit, tokenPath[0].decimals, fixed);
    const profitUSDPrint = toPrintable(profitUSD, tokenPath[0].decimals + 8, fixed);
    const profitLog = `Input: ${toPrintable(amountIn, tokenPath[0].decimals, fixed)} ${tokenPath[0].symbol}\t\tEstimate profit: ${profit.gt(0) ? profitPrint.green : profitPrint.red} ${tokenPath[0].symbol} ($ ${profitUSD.gt(0) ? profitUSDPrint.green : profitUSDPrint.red} )\tEstimate gas: ${toPrintable(gas, tokenPath[0].decimals, fixed)}\n`;
    if (profit.isFinite()) {
        table.printTable();
        console.log(profitLog);
    }
    log += profitLog;
    log += table.render() + '\n\n';
    log = stripAnsiCodes(log);
    return { table, profit, log };
}