require('dotenv').config();
const fs = require('fs');
const Web3 = require('web3');
const colors = require('colors');
const { Table } = require('console-table-printer');
const BN = require('bignumber.js');
const { getUniswapQuote, getUniswapV3Quote, getPriceFrom1InchApi, toPrintable } = require('./utils');

const tokens = require('./config/1inch.json');
const DEX = require('./config/dex.json');

const un3IQuoter = require('@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json');
const un2IRouter = require('@uniswap/v2-periphery/build/IUniswapV2Router02.json');
const shIRouter = require('@shibaswap/core/build/abi/IUniswapV2Router02.json');
const { setInterval } = require('timers');

/**
 * The network on which the bot runs.
 */
const network = 'Mainnet';

/**
 * Flashloan fee.
 */
const loanFee = 0.0005;

/**
 * Token price floating-point digit.
 */
const fixed = 4;

const web3 = new Web3(`https://${network}.infura.io/v3/${process.env.INFURA_API_KEY}`);

var un3Quoter = new web3.eth.Contract(un3IQuoter.abi, DEX[network].UniswapV3.Quoter);
const un2Router = new web3.eth.Contract(un2IRouter.abi, DEX[network].UniswapV2.Router);
const shRouter = new web3.eth.Contract(shIRouter, DEX[network].ShibaswapV2.Router);

/**
 * Display of trading and find arbitrage oppotunity.
 * @param {BigNumber} amountIn Input amount of input token.
 * @param {Array<Token>} tokenPath Token swap path.
 * @return Return profit, table, dexpath and token path.
 */
const calculateProfit = async (amountIn, tokenPath) => {
    console.log(tokenPath.map(t => t.symbol).join(' -> ') + ' -> ' + tokenPath[0].symbol);
    const table = new Table();
    const dexPath = [];
    let amountOut = [], un2AmountOut = [], un3AmountOut = [], suAmountOut = [], shAmountOut = [], gas = 0;
    amountOut[0] = un2AmountOut[0] = un3AmountOut[0] = suAmountOut[0] = shAmountOut[0] = amountIn;

    const [a, b] = BN(loanFee).toFraction();
    const feeAmount = amountOut[0].times(a).idiv(b);

    for(let i = 0; i < tokenPath.length; i++) {
        let next = (i + 1) % tokenPath.length;
        let res = await getPriceFrom1InchApi(
            tokenPath[i].address,
            tokenPath[next].address,
            amountOut[i],
            network
        );
        if(res === null) return {};
        // console.log(res);
        gas += res.estimatedGas;
        amountOut[i + 1] = BN(res.toTokenAmount);
        let toAmountPrint = toPrintable(amountOut[i + 1], tokenPath[next].decimals, fixed);
        let dexName = res.protocols[0][0][0].name;
        
        let amountInPrint = toPrintable(amountOut[i], tokenPath[i].decimals, fixed);

        table.addRow({
            'Input Token': `${amountInPrint} ${tokenPath[i].symbol}`,
            [dexName]: `${toAmountPrint} ${tokenPath[next].symbol}`
        });
    }

    const profit = amountOut[tokenPath.length].minus(amountOut[0]).minus(feeAmount);

    if(profit.isFinite()) {
        table.printTable();
        console.log(
            'Input:',
            toPrintable(amountIn, tokens[0].decimals, fixed),
            tokenPath[0].symbol,
            '\tEstimate profit:',
            profit.gt(0) ?
                profit.div(BN(10).pow(tokens[0].decimals)).toFixed(fixed).green :
                profit.div(BN(10).pow(tokens[0].decimals)).toFixed(fixed).red,
            tokenPath[0].symbol,
            '\tEstimate gas:',
            gas,
            '\n'
        );
    }
    return { profit, table, dexPath };
}

/**
 * Bot start here.
 */
const main = async () => {
    const fileContent = [];
    const WETH = {
        "id": "WETH",
        "address": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        "symbol": "WETH",
        "decimals": 18
    }
    
    for(let i in tokens) {
        let input = BN(1).times(BN(10).pow(tokens[i].decimals));
        let path = [tokens[i], WETH];
        let { profit } = await calculateProfit(input, path);
        if(profit > 0) {
            fileContent.push({
                path: path.map(t => t.symbol),
                profit: profit.div(BN(10).pow(path[0].decimals)).toFixed(fixed)
            });
        }
        // await (new Promise((resolve, reject) => {
        //     setTimeout(resolve, 2000);
        // }));
    }

    fileContent.sort((a, b) => {
        if (a.profit > b.profit) return -1;
        if (a.profit < b.profit) return 1;
        return 0;
    });
    fs.writeFileSync('output.json', JSON.stringify(fileContent), console.log);
}

main();