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

const un3IQuoter = require('@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json');
const un2IRouter = require('@uniswap/v2-periphery/build/IUniswapV2Router02.json');

const IERC20 = require('@uniswap/v2-periphery/build/IERC20.json');

/**
 * The network on which the bot runs.
 */
const network = 'Kovan';

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
const flashSwapContract = new web3.eth.Contract(IContract.abi, process.env.TESTNET_CONTRACT_ADDRESS);

var un3Quoter = new web3.eth.Contract(un3IQuoter.abi, DEX[network].UniswapV3.Quoter);
const un2Router = new web3.eth.Contract(un2IRouter.abi, DEX[network].UniswapV2.Router);

var token;
var tokenContract = [];                 // Array of contracts of tokens
var tokenDecimal = [];                  // Array of decimals of tokens

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

    let amountOut = [], un2AmountOut = [], un3AmountOut = [], suAmountOut = [];
    amountOut[0] = un2AmountOut[0] = un3AmountOut[0] = suAmountOut[0] = inputAmount;

    const [a, b] = BN(loanFee).toFraction();
    const feeAmount = amountOut[0].times(a).idiv(b);

    for(let i = 0; i < token.length; i++) {
        let next = (i + 1) % token.length;
        
        [un2AmountOut[i + 1], un3AmountOut[i + 1], suAmountOut[i + 1]] = await Promise.all([
            getUniswapQuote(amountOut[i], tokenContract[i].options.address, tokenContract[next].options.address, un2Router),
            getUniswapV3Quote(amountOut[i], tokenContract[i].options.address, tokenContract[next].options.address, un3Quoter),
            getUniswapQuote(amountOut[i], tokenContract[i].options.address, tokenContract[next].options.address, un2Router),
        ]);
        amountOut[i + 1] = BN.max(un2AmountOut[i + 1], un3AmountOut[i + 1], suAmountOut[i + 1]);
        let amountIn = toPrintable(amountOut[i], tokenDecimal[i], fixed);

        let un2AmountPrint = toPrintable(un2AmountOut[i + 1], tokenDecimal[next], fixed);
        let un3AmountPrint = toPrintable(un3AmountOut[i + 1], tokenDecimal[next], fixed);
        let suAmountPrint = toPrintable(suAmountOut[i + 1], tokenDecimal[next], fixed);

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
        else dexPath.push(0);

        table.addRow({
            'Input Token': `${amountIn} ${token[i]}`,
            'UniSwapV3': `${un3AmountPrint} ${token[next]}`,
            'UniSwapV2': `${un2AmountPrint} ${token[next]}`,
            'SushiSwap': `${suAmountPrint} ${token[next]}`,
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