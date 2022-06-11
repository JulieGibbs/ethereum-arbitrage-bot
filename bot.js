require('dotenv').config();
const Web3 = require('web3');
const colors = require('colors');
const { Table } = require('console-table-printer');
const BN = require('bignumber.js');
const { getPriceFromContract, getPriceFromApi, toPrintable } = require('./utils');

const tokenAddress = require('./config/token.json');
const dexAddress = require('./config/dex.json');

const un2IFactory = require('@uniswap/v2-core/build/IUniswapV2Factory.json');
const un3IFactory = require('@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Factory.sol/IUniswapV3Factory.json');
const sbIFactory = require('@shibaswap/core/build/abi/IUniswapV2Factory.json');

const un2IPair = require('@uniswap/v2-core/build/IUniswapV2Pair.json');
const un3IPair = require('@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json');
const sbIPair = require('@shibaswap/core/build/abi/IUniswapV2Pair.json');

const un2IRouter = require('@uniswap/v2-periphery/build/IUniswapV2Router02.json');
const un3IRouter = require('@uniswap/v3-periphery/artifacts/contracts/interfaces/ISwapRouter.sol/ISwapRouter.json');
const sbIRouter = require('@shibaswap/core/build/abi/IUniswapV2Router02.json');

const IERC20 = require('@uniswap/v2-periphery/build/IERC20.json');

/**
 * The network on which the bot runs.
 */
const network = 'Kovan';

/**
 * Tokens to trade.
 */
const token = ['DAI', 'WETH'];

/**
 * Initial amount of token.
 */
const initial = 2000;

/**
 * Token price floating-point digit.
 */
const fixed = 4;

const web3 = new Web3(`https://${network}.infura.io/v3/${process.env.INFURA_KEY}`);
const account = web3.eth.accounts.privateKeyToAccount(process.env.PRIVATE_KEY).address;

const un2Factory = new web3.eth.Contract(un2IFactory.abi, dexAddress.Ethereum[network].UniswapV2.Factory);      //UniSwapV2 factory contract
const un3Factory = new web3.eth.Contract(un3IFactory.abi, dexAddress.Ethereum[network].UniswapV3.Factory);      //UniSwapV3 factory contract
const suFactory = new web3.eth.Contract(un2IFactory.abi, dexAddress.Ethereum[network].SushiswapV2.Factory);     //SushiSwap factory contract
// const shFactory = new web3.eth.Contract(sbIFactory, dexAddress.Ethereum[network].ShibaswapV2.Factory);       //ShibaSwap factory contract

const un2Router = new web3.eth.Contract(un2IRouter.abi, dexAddress.Ethereum[network].UniswapV2.Router);
const un3Router = new web3.eth.Contract(un3IRouter.abi, dexAddress.Ethereum[network].UniswapV3.Router);
const suRouter = new web3.eth.Contract(un2IRouter.abi, dexAddress.Ethereum[network].SushiswapV2.Router);
// const sbRouter = new web3.eth.Contract(sbIRouter, dexAddress.Ethereum[network].ShibaswapV2.Router);

var tokenContract = [];                 // Array of contracts of tokens
var tokenDecimal = [];                  // Array of decimals of tokens
var un2Pair = [];                       // UniSwapV2 token pair contract
var un3Pair = [];                       // UniSwapV3 token pair contract
var suPair = [];                        // SushiSwap token pair contract
var shPair = [];                     // ShibaSwap token pair contract

/**
 * Print user's eth and tokens balance.
 */
const printAccountBalance = async () => {
    const table = new Table();
    const row = { 'Token': 'Balance' };

    let ethBalance = await web3.eth.getBalance(account);
    row['ETH'] = toPrintable(ethBalance, 18);

    let promises = token.map((t, i) => tokenContract[i].methods.balanceOf(account).call());
    let balances = await Promise.all(promises);
    balances.forEach((bal, i) => {
        row[token[i]] = toPrintable(bal, tokenDecimal[i]);
    });

    table.addRow(row);
    table.printTable();
    console.log('-------------------------------------------------------------------------------------------------------------------');
}

/**
 * Swap token to other token on dex.
 * @param {number} tokenInId Input token id
 * @param {BigNumber} amountIn Input amount of token
 * @param {number} tokenOutId Output token id
 * @param {BigNumber} amountOut Estimate output amount of token
 * @param {Contract} router Router contract of dex
 */
const swap = async (tokenInId, amountIn, tokenOutId, amountOut, router) => {
    // let dex;
    // if(router === un2Router) dex = 'UniswapV2';
    // if(router === suRouter) dex = 'Sushiswap';
    // let tokenIn = toPrintable(amountIn, tokenDecimal[tokenInId], 4);
    // let tokenOut = toPrintable(amountOut, tokenDecimal[tokenOutId], 4);
    // console.log(`${tokenIn} ${token[tokenInId]} -> ${tokenOut} ${token[tokenOutId]} on ${dex}`);
    // return;

    let timestamp = Math.floor(Date.now() / 1000) + 60 * 120;
    let swap = router.methods.swapExactTokensForTokens(
        amountIn.toFixed(),
        amountOut.toFixed(),
        [tokenContract[tokenInId].options.address, tokenContract[tokenOutId].options.address],
        account,
        timestamp
    );
    let tx = {
        from: account,
        to: router.options.address,
        gas: 200000,
        data: swap.encodeABI()
    }
    let signedTx = await web3.eth.accounts.signTransaction(tx, process.env.PRIVATE_KEY);

    if(router === un2Router) dex = 'UniswapV2';
    if(router === suRouter) dex = 'Sushiswap';
    console.log(`${token[tokenInId]} -> ${token[tokenOutId]} swaping on ${dex} ...`);

    try{
        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    
        let tokenIn = toPrintable(amountIn, tokenDecimal[tokenInId], 4);
        let tokenOut = toPrintable(amountOut, tokenDecimal[tokenOutId], 4);
        console.log(`${tokenIn} ${token[tokenInId]} -> ${tokenOut} ${token[tokenOutId]} swaped!`);
        console.log('Transaction hash:', receipt.transactionHash.yellow);
    }
    catch(err) {
        console.log(err);
        process.exit();
    }
}

/**
 * Initialize token contracts, token decimals, token pair contracts.
 */
const initContract = async () => {
    console.log('-------------------------------------------------------------------------------------------------------------------');
    console.log('-------------------------------------------------------------------------------------------------------------------');
    console.log(`Bot is running on ${network.yellow}. Initializing...`);
    console.log();
    // Initialize token contracts and decimals.
    token.forEach((v, i) => {
        tokenContract[i] = new web3.eth.Contract(IERC20.abi, tokenAddress[network][v]);
    });
    let promises = token.map((v, i) => tokenContract[i].methods.decimals().call());
    tokenDecimal = await Promise.all(promises);
    const tokenTable = new Table({
        title: 'Token List'.green,
        columns: [
            { name: "Token" },
            { name: "Decimal" },
            { name: "Address", alignment: "center"}
        ]
    });
    token.forEach((v, i) => {
        tokenDecimal[i] = parseInt(tokenDecimal[i]);
        tokenTable.addRow({
            'Token': v,
            'Decimal': tokenDecimal[i],
            'Address': tokenAddress[network][v]
        });
    });
    tokenTable.printTable();
    console.log();
    // Initialize token pair contracts.
    for(let i = 0; i < token.length; i++) {
        let next = (i + 1) % token.length;
        let table = new Table({
            title: `${token[i]} -> ${token[next]}`.green,
            columns: [
                { name: 'dex', title: 'DEX', alignment: 'center' },
                { name: 'address', title: 'Pool Contract Address', alignment: 'center' }
            ]
        });

        let [un2PairAddress, un3PairAddress, suPairAddress/*, shPairAddress*/] = await Promise.all([
            un2Factory.methods.getPair(tokenContract[i].options.address, tokenContract[next].options.address).call(),
            un3Factory.methods.getPool(tokenContract[i].options.address, tokenContract[next].options.address, 3000).call(),
            suFactory.methods.getPair(tokenContract[i].options.address, tokenContract[next].options.address).call(),
            // shFactory.methods.getPair(tokenContract[i].options.address, tokenContract[next].options.address).call()
        ]);
        un2Pair[i] = new web3.eth.Contract(un2IPair.abi, un2PairAddress);
        un3Pair[i] = new web3.eth.Contract(un3IPair.abi, un3PairAddress);
        suPair[i] = new web3.eth.Contract(un2IPair.abi, suPairAddress);
        // shPair[i] = new web3.eth.Contract(sbIPair, shPairAddress);

        table.addRows([
            { dex: 'UniSwapV2', address: un2Pair[i].options.address },
            { dex: 'UniSwapV3', address: un3Pair[i].options.address },
            { dex: 'SushiSwap', address: suPair[i].options.address },
            // { dex: 'ShibaSwap', address: shPair[i].options.address }
        ])
        table.printTable();
    }
    console.log();
    console.log('Contract is initialized.');
    console.log('-------------------------------------------------------------------------------------------------------------------');
    console.log('Your Wallet:'.yellow, account);
    await printAccountBalance();
}

/**
 * Display of trading and find arbitrage oppotunity.
 */
const runBot = async () => {
    const table = new Table();

    let amountOut = [], un2AmountOut = [], un3AmountOut = [], suAmountOut = []/*, shAmountOut = []*/;
    amountOut[0] = un2AmountOut[0] = un3AmountOut[0] = suAmountOut[0]/* = shAmountOut[0]*/ = BN(initial).times(BN(10).pow(tokenDecimal[0]));

    for(let i = 0; i < token.length; i++) {
        let next = (i + 1) % token.length;
        
        [un2AmountOut[i + 1], un3AmountOut[i + 1], suAmountOut[i + 1]/*, shAmountOut[i + 1]*/] = await Promise.all([
            getPriceFromContract(amountOut[i], tokenContract[i].options.address, tokenContract[next].options.address, un2Pair[i]),
            // getPriceFromContract(amountOut[i], tokenContract[i].options.address, tokenContract[next].options.address, un2Pair[i]),
            getPriceFromApi(tokenContract[i].options.address, tokenContract[next].options.address, amountOut[i].toFixed(), 3, network),
            getPriceFromContract(amountOut[i], tokenContract[i].options.address, tokenContract[next].options.address, suPair[i]),
            // getPriceFromContract(amountOut[i], tokenContract[i].options.address, tokenContract[next].options.address, shPair[i])
        ]);
        amountOut[i + 1] = BN.max(un2AmountOut[i + 1], un3AmountOut[i + 1], suAmountOut[i + 1]/*, shAmountOut[i + 1]*/);
        let amountIn = toPrintable(amountOut[i], tokenDecimal[i], fixed);

        let un2AmountPrint = toPrintable(un2AmountOut[i + 1], tokenDecimal[next], fixed);
        let un3AmountPrint = toPrintable(un3AmountOut[i + 1], tokenDecimal[next], fixed);
        let suAmountPrint = toPrintable(suAmountOut[i + 1], tokenDecimal[next], fixed);
        // let shAmountPrint = toPrintable(shAmountOut[i + 1], tokenDecimal[next], fixed);

        if(amountOut[i + 1].eq(un2AmountOut[i + 1])) un2AmountPrint = un2AmountPrint.underline;
        if(amountOut[i + 1].eq(un3AmountOut[i + 1])) un3AmountPrint = un3AmountPrint.underline;
        if(amountOut[i + 1].eq(suAmountOut[i + 1])) suAmountPrint = suAmountPrint.underline;
        // if(amountOut[i + 1].eq(shAmountOut[i + 1])) shAmountPrint = shAmountPrint.underline;
        
        table.addRow({
            'Input Token': `${amountIn} ${token[i]}`,
            'UniSwapV3': `${un3AmountPrint} ${token[next]}`,
            'UniSwapV2': `${un2AmountPrint} ${token[next]}`,
            'SushiSwap': `${suAmountPrint} ${token[next]}`,
            // 'ShibaSwap': `${shAmountPrint} ${token[next]}`
        });
    }
    table.printTable();

    if(amountOut[0].lt(amountOut[token.length])) {
        console.log('Arbitrage Found! Estimate profit:'.green, toPrintable(amountOut[token.length].minus(amountOut[0]), tokenDecimal[0], fixed), token[0]);
        
    }
    console.log();
    setTimeout(runBot, 1000);
}

/**
 * Bot start here.
 */
const main = async () => {
    await initContract();
    runBot();
}

main();