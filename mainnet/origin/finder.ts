import 'colors';
import fs from 'fs';
import BN from 'bignumber.js';
import { Token } from '../../lib/types';
import TOKEN from '../../config/mainnet.json';
import { calculateProfit } from './common';
import { init, network } from '../../lib/config';


const run = async (tokenPath: Token[]) => {
    if (tokenPath[0] == tokenPath[1] || tokenPath[1] == tokenPath[2]) return;
    const initial = new BN(init).times(new BN(10).pow(tokenPath[0].decimals));
    const { profit, log } = await calculateProfit(initial, tokenPath);
    if (!profit || profit.lte(0)) return;
    
    const date = new Date();
    const fileName = `./logs/main-${date.toISOString().substring(0, 10)}.log`;
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