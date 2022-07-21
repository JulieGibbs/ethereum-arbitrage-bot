import fs from 'fs';
import 'colors';
import BN from 'bignumber.js';
import TOKEN from '../../config/super_short.json';
import { calculateProfit } from './common';
import { Token } from '../../lib/types';


const run = async (tokenPath: Token[]) => {
    const initial = new BN(1).times(new BN(10).pow(tokenPath[0].decimals));
    const { profit, log } = await calculateProfit(initial, tokenPath);
    if (!profit || profit.lte(0)) return;
    
    const date = new Date();
    const fileName = `./logs/dodo-${date.toISOString().substring(0, 10)}.log`;
    fs.appendFile(fileName, log, () => {});
}

const main = async () => {
    let args = process.argv.slice(2).map(arg => arg.toUpperCase());
    if (args.length < 2) return console.log('Please input at least two token.');

    args.forEach(arg => {
        if (arg === '*' || TOKEN[arg]) return;
        console.log(`There's no ${arg} token.`.red);
        process.exit();
    });

    const getTokens = async (symbols: string[], index: number) => {
        if (!symbols[index]) return await run(symbols.map(symbol => TOKEN[symbol]));
        if (symbols[index] === '*') {
            for (let tokenSymbol in TOKEN) {
                await getTokens([...symbols.slice(0, index), tokenSymbol, ...symbols.slice(index + 1)], index + 1);
            }
        }
        else await getTokens(symbols, index + 1);
    }

    await getTokens(args, 0);

}

main();