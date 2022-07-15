import fs from 'fs';
import 'colors';
import BN from 'bignumber.js';
import { fixed } from '../../lib/config';
import { FileContent } from '../../lib/types';
import TOKEN from '../../config/super_short.json';
import { calculateProfit } from './common';

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
            let { profit } = await calculateProfit(input, path);
            if (profit && profit.gt(0)) {
                fileContent.push({
                    path: path.map(t => t.symbol),
                    profit: profit.div(new BN(10).pow(path[0].decimals)).toFixed(fixed)
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