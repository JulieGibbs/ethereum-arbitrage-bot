import * as dotenv from 'dotenv';
import fs from 'fs';
import Web3 from 'web3';
import 'colors';
import { Table } from 'console-table-printer';
import BN from 'bignumber.js';
import { getUniswapQuote, getUniswapV3Quote, toPrintable, getKyberQuote, getBalancerQuote } from '../lib/utils';

// Types
import { Token, Network, FileContent } from '../lib/types';
import { AbiItem } from 'web3-utils';

import TOKEN from '../config/tokens.json';
import DEX from '../config/dexs.json';

// ABIs
import un3IQuoter from '../abi/UniswapV3IQuoter.json';
import un2IRouter from '../abi/IUniswapV2Router02.json';
import shIRouter from '../abi/IUniswapV2Router02.json';
import dfIRouter from '../abi/IUniswapV2Router02.json';
import bsIRouter from '../abi/BalancerVault.json';
import kyberIQuoter from '../abi/KyberQuoter.json';

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
const bsRouter = new web3.eth.Contract(bsIRouter.abi as AbiItem[], DEX[network].Balancerswap.Vault);
const kbQuoter = new web3.eth.Contract(kyberIQuoter.abi as AbiItem[], DEX[network].Kyberswap.Quoter)

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

    const amountOut: BN[] = [],
        un2AmountOut: BN[] = [],
        un3AmountOut: BN[] = [],
        suAmountOut: BN[] = [],
        shAmountOut: BN[] = [],
        dfAmountOut: BN[] = [],
        bsAmountOut: BN[] = [],
        kbAmountOut: BN[] = [];
    amountOut[0] = un2AmountOut[0] = un3AmountOut[0] = suAmountOut[0] = shAmountOut[0] = bsAmountOut[0] = kbAmountOut[0] = amountIn;

    const [a, b] = new BN(loanFee).toFraction();
    const feeAmount = amountOut[0].times(a).idiv(b);

    for (let i = 0; i < tokenPath.length; i++) {
        let next = (i + 1) % tokenPath.length;

        [
            un2AmountOut[i + 1],
            un3AmountOut[i + 1],
            suAmountOut[i + 1],
            shAmountOut[i + 1],
            dfAmountOut[i + 1],
            bsAmountOut[i + 1],
            kbAmountOut[i + 1]
        ] = await Promise.all([
            getUniswapQuote(amountOut[i], tokenPath[i].address, tokenPath[next].address, un2Router),
            getUniswapV3Quote(amountOut[i], tokenPath[i].address, tokenPath[next].address, un3Quoter),
            getUniswapQuote(amountOut[i], tokenPath[i].address, tokenPath[next].address, suRouter),
            getUniswapQuote(amountOut[i], tokenPath[i].address, tokenPath[next].address, shRouter),
            getUniswapQuote(amountOut[i], tokenPath[i].address, tokenPath[next].address, dfRouter),
            getBalancerQuote(amountOut[i], tokenPath[i].address, tokenPath[next].address, bsRouter),
            getKyberQuote(amountOut[i], tokenPath[i].address, tokenPath[next].address, kbQuoter)
        ]);

        amountOut[i + 1] = BN.max(
            un2AmountOut[i + 1],
            un3AmountOut[i + 1],
            suAmountOut[i + 1],
            shAmountOut[i + 1],
            dfAmountOut[i + 1],
            bsAmountOut[i + 1],
            kbAmountOut[i + 1]
        );
        let amountInPrint = toPrintable(amountOut[i], tokenPath[i].decimals, fixed);

        let un2AmountPrint = toPrintable(un2AmountOut[i + 1], tokenPath[next].decimals, fixed);
        let un3AmountPrint = toPrintable(un3AmountOut[i + 1], tokenPath[next].decimals, fixed);
        let suAmountPrint = toPrintable(suAmountOut[i + 1], tokenPath[next].decimals, fixed);
        let shAmountPrint = toPrintable(shAmountOut[i + 1], tokenPath[next].decimals, fixed);
        let dfAmountPrint = toPrintable(dfAmountOut[i + 1], tokenPath[next].decimals, fixed);
        let bsAmountPrint = toPrintable(bsAmountOut[i + 1], tokenPath[next].decimals, fixed);
        let kbAmountPrint = toPrintable(kbAmountOut[i + 1], tokenPath[next].decimals, fixed);

        if (amountOut[i + 1].eq(un2AmountOut[i + 1])) {
            un2AmountPrint = un2AmountPrint.underline;
            dexPath.push(DEX[network].UniswapV2.id);
        }
        else if (amountOut[i + 1].eq(un3AmountOut[i + 1])) {
            un3AmountPrint = un3AmountPrint.underline;
            dexPath.push(DEX[network].UniswapV3.id);
        }
        else if (amountOut[i + 1].eq(suAmountOut[i + 1])) {
            suAmountPrint = suAmountPrint.underline;
            dexPath.push(DEX[network].SushiswapV2.id);
        }
        else if (amountOut[i + 1].eq(shAmountOut[i + 1])) {
            shAmountPrint = shAmountPrint.underline;
            dexPath.push(DEX[network].ShibaswapV2.id);
        }
        else if (amountOut[i + 1].eq(dfAmountOut[i + 1])) {
            dfAmountPrint = dfAmountPrint.underline;
            dexPath.push(DEX[network].DefiSwap.id);
        }
        else if (amountOut[i + 1].eq(kbAmountOut[i + 1])) {
            kbAmountPrint = kbAmountPrint.underline;
            dexPath.push(DEX[network].Kyberswap.id);
        }
        else if (amountOut[i + 1].eq(bsAmountOut[i + 1])) {
            bsAmountPrint = bsAmountPrint.underline;
            dexPath.push(DEX[network].Balancerswap.id);
        }
        else dexPath.push(0);

        table.addRow({
            'Input Token': `${amountInPrint} ${tokenPath[i].symbol}`,
            'UniSwapV3': `${un3AmountPrint} ${tokenPath[next].symbol}`,
            'UniSwapV2': `${un2AmountPrint} ${tokenPath[next].symbol}`,
            'SushiSwap': `${suAmountPrint} ${tokenPath[next].symbol}`,
            'ShibaSwap': `${shAmountPrint} ${tokenPath[next].symbol}`,
            'DefiSwap': `${dfAmountPrint} ${tokenPath[next].symbol}`,
            'Balancer': `${bsAmountPrint} ${tokenPath[next].symbol}`,
            'KyberSwap': `${kbAmountPrint} ${tokenPath[next].symbol}`
        });
    }

    const profit = amountOut[tokenPath.length].minus(amountOut[0]).minus(feeAmount);

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
            '\n'
        );
    }
    return { profit, table, dexPath };
}

/**
 * Bot start here.
 */
const main = async () => {
    const fileContent: FileContent = [];

    for (let i in TOKEN[network]) {
        if (TOKEN[network][i] === TOKEN[network]['WETH']) continue;
        let input = new BN(1).times(new BN(10).pow(TOKEN[network][i].decimals));
        let path = [TOKEN[network][i], TOKEN[network]['WETH']];
        let { profit } = await calculateProfit(input, path);
        if (profit.gt(0)) {
            fileContent.push({
                path: path.map(t => t.symbol),
                profit: profit.div(new BN(10).pow(path[0].decimals)).toFixed(fixed)
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