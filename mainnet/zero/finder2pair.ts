import * as dotenv from 'dotenv';
import fs from 'fs';
import 'colors';
import { Table } from 'console-table-printer';
import BN from 'bignumber.js';
import { getPriceOnOracle, getSwapFromZeroXApi, toPrintable } from '../../lib/utils';

// Types
import { Token, Network, FileContent } from '../../lib/types';

const TOKEN = require('../../config/mainnet.json');

dotenv.config({ path: __dirname + '/../../.env' });

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

const calculateProfit = async (amountIn: BN, tokenPath: Token[]) => {
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
        // console.log(res);
        gas += parseInt(res.gas);
        amountOut[i + 1] = new BN(res.buyAmount);
        let toAmountPrint = toPrintable(amountOut[i + 1], tokenPath[next].decimals, fixed);
        let dexName = res.orders[0].source;

        let amountInPrint = toPrintable(amountOut[i], tokenPath[i].decimals, fixed);

        table.addRow({
            'Input Token': `${amountInPrint} ${tokenPath[i].symbol}`,
            [dexName]: `${toAmountPrint} ${tokenPath[next].symbol}`
        });
    }
    let price = tokenPath[0].symbol != TOKEN.USDT.symbol ? await getPriceOnOracle(
        tokenPath[0],
        TOKEN.USDT,
    ) : new BN(1);
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

/**
 * Bot start here.
 */
const main = async () => {
    const fileContent: FileContent = [];

    for (let i in TOKEN) {
        if (i === 'WETH') continue;
        let input = new BN(10).times(new BN(10).pow(TOKEN['WETH'].decimals));
        let path = [TOKEN['WETH'], TOKEN[i]];
        let { profitUSD } = await calculateProfit(input, path);
        if (profitUSD && profitUSD.gt(0)) {
            fileContent.push({
                path: path.map(t => t.symbol),
                profit: '$' + profitUSD.div(new BN(10).pow(path[0].decimals)).toFixed(fixed)
            });
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