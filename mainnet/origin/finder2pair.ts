import fs from 'fs';
import { fixed } from '../../lib/config';
import 'colors';
import BN from 'bignumber.js';
import { FileContent } from '../../lib/types';
import TOKEN from '../../config/super_short.json';
import { calculateProfit } from './common';

/**
 * Bot start here.
 */
const main = async () => {
    const fileContent: FileContent = [];

    for (let i in TOKEN) {
        if (i === 'WETH') continue;
        let input = new BN(1).times(new BN(10).pow(TOKEN['WETH'].decimals));
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