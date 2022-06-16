require('dotenv').config();
const Web3 = require('web3');
const colors = require('colors');
const inquirer = require('inquirer');
const { Table } = require('console-table-printer');
const BN = require('bignumber.js');
const { getUniswapQuote, getUniswapV3Quote, toPrintable } = require('./utils');

const tokenAddress = require('./config/token.json');
const DEX = require('./config/dex.json');
const IContract = require('./config/UniswapFlash.json');

const un2IFactory = require('@uniswap/v2-core/build/IUniswapV2Factory.json');
const un3IFactory = require('@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Factory.sol/IUniswapV3Factory.json');
const sbIFactory = require('@shibaswap/core/build/abi/IUniswapV2Factory.json');

const un2IPair = require('@uniswap/v2-core/build/IUniswapV2Pair.json');
const un3IPair = require('@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json');
const sbIPair = require('@shibaswap/core/build/abi/IUniswapV2Pair.json');

const un3IQuoter = require('@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json');
const IERC20 = require('@uniswap/v2-periphery/build/IERC20.json');

/**
 * The network on which the bot runs.
 */
const network = 'Mainnet';

/**
 * Initial amount of token.
 */
// const initial = 1;

/**
 * Flashloan fee.
 */
const loanFee = 0.0005;

/**
 * Token price floating-point digit.
 */
const fixed = 4;

const web3 = new Web3(`https://${network}.infura.io/v3/${process.env.INFURA_KEY}`);
const account = web3.eth.accounts.privateKeyToAccount(process.env.PRIVATE_KEY).address;
const flashSwapContract = new web3.eth.Contract(IContract.abi, process.env.CONTRACT_ADDRESS);

const un2Factory = new web3.eth.Contract(un2IFactory.abi, DEX[network].UniswapV2.Factory);      //UniSwapV2 factory contract
const un3Factory = new web3.eth.Contract(un3IFactory.abi, DEX[network].UniswapV3.Factory);      //UniSwapV3 factory contract
const suFactory = new web3.eth.Contract(un2IFactory.abi, DEX[network].SushiswapV2.Factory);     //SushiSwap factory contract
const shFactory = new web3.eth.Contract(sbIFactory, DEX[network].ShibaswapV2.Factory);       //ShibaSwap factory contract

var token;
var tokenContract = [];                 // Array of contracts of tokens
var tokenDecimal = [];                  // Array of decimals of tokens
var un2Pair = [];                       // UniSwapV2 token pair contract
var un3Pair = [];                       // UniSwapV3 token pair contract
var suPair = [];                        // SushiSwap token pair contract
var shPair = [];                        // ShibaSwap token pair contract
var un3Quoter = new web3.eth.Contract(un3IQuoter.abi, DEX[network].UniswapV3.Quoter);

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
 * Call the contract and perform flashswap.
 * @param {string} loanToken Address of token to flashloan
 * @param {BigNumber} loanAmount Flashloan amount
 * @param {Array<string>} tradePath Swap path of token
 * @param {Array<number>} dexPath Swap path of dex
 */
const callFlashSwap = async (loanToken, loanAmount, tradePath, dexPath) => {
    console.log('Swapping ...');
    let otherToken = loanToken === tokenAddress[network].WETH ? tokenAddress[network].DAI : tokenAddress[network].WETH;
    const init = flashSwapContract.methods.initUniFlashSwap(
        [loanToken, otherToken],
        [loanAmount.toFixed(), '0'],
        tradePath,
        dexPath
    );
    const tx = {
        from: account,
        to: flashSwapContract.options.address,
        gas: 2000000,
        data: init.encodeABI()
    };
    const signedTx = await web3.eth.accounts.signTransaction(tx, process.env.PRIVATE_KEY);

    try{
        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
        console.log('Completed. Transaction hash:', receipt.transactionHash);
    }
    catch(err) {
        console.log(err);
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

        let [un2PairAddress, un3PairAddress, suPairAddress, shPairAddress] = await Promise.all([
            un2Factory.methods.getPair(tokenContract[i].options.address, tokenContract[next].options.address).call(),
            un3Factory.methods.getPool(tokenContract[i].options.address, tokenContract[next].options.address, 3000).call(),
            suFactory.methods.getPair(tokenContract[i].options.address, tokenContract[next].options.address).call(),
            shFactory.methods.getPair(tokenContract[i].options.address, tokenContract[next].options.address).call()
        ]);
        un2Pair[i] = new web3.eth.Contract(un2IPair.abi, un2PairAddress);
        un3Pair[i] = new web3.eth.Contract(un3IPair.abi, un3PairAddress);
        suPair[i] = new web3.eth.Contract(un2IPair.abi, suPairAddress);
        shPair[i] = new web3.eth.Contract(sbIPair, shPairAddress);

        table.addRows([
            { dex: 'UniSwapV2', address: un2Pair[i].options.address },
            { dex: 'UniSwapV3', address: un3Pair[i].options.address },
            { dex: 'SushiSwap', address: suPair[i].options.address },
            { dex: 'ShibaSwap', address: shPair[i].options.address }
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
 * @param {BigNumber} initial Initial amount of input token.
 * @return Return profit, table, dexpath and token path.
 */
const runBot = async (inputAmount) => {
    const table = new Table();
    const dexPath = [];
    const tokenPath = tokenContract.map(contract => contract.options.address);
    tokenPath.push(tokenPath.shift());

    let amountOut = [], un2AmountOut = [], un3AmountOut = [], suAmountOut = [], shAmountOut = [];
    amountOut[0] = un2AmountOut[0] = un3AmountOut[0] = suAmountOut[0] = shAmountOut[0] = inputAmount;

    const [a, b] = BN(loanFee).toFraction();
    const feeAmount = amountOut[0].times(a).idiv(b);

    for(let i = 0; i < token.length; i++) {
        let next = (i + 1) % token.length;
        
        [un2AmountOut[i + 1], un3AmountOut[i + 1], suAmountOut[i + 1], shAmountOut[i + 1]] = await Promise.all([
            getUniswapQuote(amountOut[i], tokenContract[i].options.address, tokenContract[next].options.address, un2Pair[i]),
            getUniswapV3Quote(amountOut[i], tokenContract[i].options.address, tokenContract[next].options.address, un3Quoter),
            getUniswapQuote(amountOut[i], tokenContract[i].options.address, tokenContract[next].options.address, suPair[i]),
            getUniswapQuote(amountOut[i], tokenContract[i].options.address, tokenContract[next].options.address, shPair[i])
        ]);
        amountOut[i + 1] = BN.max(un2AmountOut[i + 1], un3AmountOut[i + 1], suAmountOut[i + 1], shAmountOut[i + 1]);
        let amountIn = toPrintable(amountOut[i], tokenDecimal[i], fixed);

        let un2AmountPrint = toPrintable(un2AmountOut[i + 1], tokenDecimal[next], fixed);
        let un3AmountPrint = toPrintable(un3AmountOut[i + 1], tokenDecimal[next], fixed);
        let suAmountPrint = toPrintable(suAmountOut[i + 1], tokenDecimal[next], fixed);
        let shAmountPrint = toPrintable(shAmountOut[i + 1], tokenDecimal[next], fixed);

        if(amountOut[i + 1].eq(un2AmountOut[i + 1])) {
            un2AmountPrint = un2AmountPrint.underline;
            dexPath.push(DEX[network].UniswapV2.id);
        }
        else if(amountOut[i + 1].eq(un3AmountOut[i + 1])) {
            un3AmountPrint = un3AmountPrint.underline;
            dexPath.push(DEX[network].UniswapV3.id);
        }
        else if(amountOut[i + 1].eq(suAmountOut[i + 1])) {
            suAmountPrint = suAmountPrint.underline;
            dexPath.push(DEX[network].SushiswapV2.id);
        }
        else if(amountOut[i + 1].eq(shAmountOut[i + 1])) {
            shAmountPrint = shAmountPrint.underline;
            dexPath.push(DEX[network].ShibaswapV2.id);
        }
        else dexPath.push(0);

        table.addRow({
            'Input Token': `${amountIn} ${token[i]}`,
            'UniSwapV3': `${un3AmountPrint} ${token[next]}`,
            'UniSwapV2': `${un2AmountPrint} ${token[next]}`,
            'SushiSwap': `${suAmountPrint} ${token[next]}`,
            'ShibaSwap': `${shAmountPrint} ${token[next]}`
        });
    }

    table.printTable();

    const profit = amountOut[token.length].minus(amountOut[0]).minus(feeAmount);
    console.log(
        'Input:',
        toPrintable(inputAmount, tokenDecimal[0], fixed),
        token[0],
        '\tEstimate profit:',
        profit.gt(0) ?
            profit.div(BN(10).pow(tokenDecimal[0])).toFixed(fixed).green :
            profit.div(BN(10).pow(tokenDecimal[0])).toFixed(fixed).red,
        token[0]
    );
    if(profit.gt(0)) {
        let response = await inquirer.prompt([{
            type: 'input',
            name: 'isExe',
            message: `Are you sure execute this trade? (yes/no)`
        }]);
        response.isExe === 'yes' && await callFlashSwap(tokenContract[0].options.address, inputAmount, tokenPath, dexPath);
    }
    
    console.log();
    return [profit, table, dexPath, tokenPath];
}

/**
 * Bot start here.
 */
const main = async () => {
    token = process.argv.slice(2);
    if(token.length < 2) {
        console.log('Please input at least two token.');
        process.exit();
    }
    token = token.map(e => e.toUpperCase());
    token.forEach(e => {
        if(!tokenAddress[network][e]) {
            console.log(`There's no ${e} token.`);
            process.exit();
        }
    });

    await initContract();
    while(true) {
        let response = await inquirer.prompt([{
            type: 'input',
            name: 'input',
            message: `Please input ${token[0]} amount:`
        }]);
        await runBot(BN(response.input).times(BN(10).pow(tokenDecimal[0])));
    }
}

main();