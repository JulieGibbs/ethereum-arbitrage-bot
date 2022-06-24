const colors = require('colors');
const axios = require('axios');
const BN = require('bignumber.js');
const tokens = require('./config/mainnet.json');

/**
 * Calculate token price.
 * @param {string | BigNumber} amountIn Input amount of token
 * @param {string} tokenIn Input token address
 * @param {string} tokenOut Output token address
 * @param {Contract} router Router contract
 * @returns Output amount of token
 */
const getUniswapQuote = async (amountIn, tokenIn, tokenOut, router) => {
    try {
        let amountOuts = await router.methods.getAmountsOut(amountIn.toFixed(), [tokenIn, tokenOut]).call();
        return BN(amountOuts[1]);
    }
    catch (err) {
        return BN(-Infinity);
    }
}

/**
 * Calculate token price.
 * @param {string | BigNumber} amountIn Input amount of token
 * @param {string} tokenIn Input token address
 * @param {string} tokenOut Output token address
 * @param {Contract} quoter Quoter contract
 * @returns Output amount of token
 */
const getUniswapV3Quote = async (amountIn, tokenIn, tokenOut, quoter) => {
    try {
        const amountOut = await quoter.methods.quoteExactInputSingle(
            tokenIn,
            tokenOut,
            3000,
            amountIn.toFixed(),
            0
        ).call();
        return BN(amountOut);
    }
    catch (err) {
        return BN(-Infinity);
    }
}

const getKyberQuote = async (amountIn, tokenIn, tokenOut, quoter) => {
    try {
        const quoteOut = await quoter.methods.quoteExactInputSingle(
            {
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                feeUnits: 3000,
                amountIn: amountIn.toFixed(),
                limitSqrtP: 0
            }
        ).call();
        // console.log(quoteOut);

        return BN(quoteOut.returnedAmount);
    }
    catch (err) {
        // console.log(err);
        // process.exit();
        return BN(-Infinity);
    }
}

const getBalancerQuote = async (amountIn, tokenIn, tokenOut, quoter) => {
    const pool_WETH_USDC = "0x3a19030ed746bd1c3f2b0f996ff9479af04c5f0a000200000000000000000004";
    const tokenPath = [tokenIn, tokenOut];
    const swap_steps_struct = [];

    for (var i = 0; i < tokenPath.length - 1; i++) {
        const swap_struct =
        {
            poolId: pool_WETH_USDC,
            assetInIndex: i,
            assetOutIndex: i + 1,
            amount: amountIn.toFixed(),
            userData: '0x'
        };
        swap_steps_struct.push(swap_struct);
    }

    const fund_struct = {
        sender: "0xB7Bb04e5D6a6493f79b36d2E9c2D94a26d731b94",
        fromInternalBalance: false,
        recipient: "0xB7Bb04e5D6a6493f79b36d2E9c2D94a26d731b94",
        toInternalBalance: false
    };

    try {
        const quoteOut = await quoter.methods.queryBatchSwap(
            0,
            swap_steps_struct,
            tokenPath,
            fund_struct
        ).call();
        return BN(quoteOut[tokenPath.length - 1]);
    }
    catch (err) {
        return BN(-Infinity);
    }
}

/**
 * Fetch quote on uniswap from api.
 * @param {string} tokenIn Input token address
 * @param {string} tokenOut Output token address
 * @param {string} amountIn Input amount of token
 * @param {number} version Version of uniswap
 * @param {string} network Network name
 * @returns Output amount of token on Uniswap.
 */
const getPriceFromApi = async (tokenIn, tokenOut, amountIn, version, network) => {
    let networkId = 1;
    if (network === 'Ropsten') networkId = 3;
    if (network === 'Rinkeby') networkId = 4;
    if (network === 'Goerli') networkId = 5;
    if (network === 'Kovan') networkId = 42;
    try {
        const res = await axios.get('https://api.uniswap.org/v1/quote', {
            headers: {
                origin: 'https://app.uniswap.org'
            },
            params: {
                protocols: 'v' + version,
                tokenInAddress: tokenIn,
                tokenInChainId: networkId,
                tokenOutAddress: tokenOut,
                tokenOutChainId: networkId,
                amount: amountIn,
                type: 'exactIn'
            }
        });
        return BN(res.data.quote);
    }
    catch (err) {
        return BN(-Infinity);
    }
}

const getPriceFrom1InchApi = async (tokenIn, tokenOut, amountIn, network) => {
    let chainId = 1;
    if (network === 'Ropsten') chainId = 3;
    if (network === 'Rinkeby') chainId = 4;
    if (network === 'Goerli') chainId = 5;
    if (network === 'Kovan') chainId = 42;
    try {
        const res = await axios.get(`https://api.1inch.exchange/v4.0/${chainId}/quote`, {
            params: {
                fromTokenAddress: tokenIn,
                toTokenAddress: tokenOut,
                amount: amountIn.toFixed()
            }
        });
        return res.data;
    }
    catch (err) {
        return null;
    }
}


/**
 * Change big number to fixed.
 * @param {string | BigNumber} amount Amount of token
 * @param {number} decimal Decimal of token
 * @param {number} fixed Fixed count
 * @returns Returns printable amount of token.
 */
const toPrintable = (amount, decimal, fixed) => {
    return BN(amount).isFinite()
        ? BN(amount).div(BN(10).pow(decimal)).toFixed(fixed).yellow
        : 'N/A'.yellow;
}

module.exports = {
    getUniswapQuote,
    getUniswapV3Quote,
    getPriceFromApi,
    getPriceFrom1InchApi,
    getKyberQuote,
    getBalancerQuote,
    toPrintable
}