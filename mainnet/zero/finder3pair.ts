import fs from 'fs';
import 'colors';
import { fixed } from '../../lib/config';
import BN from 'bignumber.js';
import TOKEN from '../../config/mainnet.json';

// Types
import { FileContent } from '../../lib/types';
import { calculateProfit } from './common';


/**
 * Bot start here.
 */
const main = async () => {
    const fileContent: FileContent = [];

    for (let i in TOKEN) {
        for (let j in TOKEN) {
            if (i === 'WETH' || 'WETH' === j || j === i) continue;
            let input = new BN(10).times(new BN(10).pow(TOKEN['WETH'].decimals));
            let path = [TOKEN['WETH'], TOKEN[i], TOKEN[j]];
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