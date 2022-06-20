const colors = require('colors');
const axios = require('axios');
const BN = require('bignumber.js');

/**
 * Calculate token price.
 * @param {string | BigNumber} amountIn Input amount of token
 * @param {string} tokenIn Input token address
 * @param {string} tokenOut Output token address
 * @param {Contract} router Router contract
 * @returns Output amount of token
 */
const getUniswapQuote = async (amountIn, tokenIn, tokenOut, router) => {
    try{
        let amountOuts = await router.methods.getAmountsOut(amountIn.toFixed(), [tokenIn, tokenOut]).call();
        return BN(amountOuts[1]);
    }
    catch(err) {
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
    try{
        return await quoter.methods.quoteExactInputSingle(
            tokenIn,
            tokenOut,
            3000,
            amountIn.toFixed(),
            '0'
        ).call();
    }
    catch(err) {
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
    if(network === 'Ropsten') networkId = 3;
    if(network === 'Rinkeby') networkId = 4;
    if(network === 'Goerli') networkId = 5;
    if(network === 'Kovan') networkId = 42;
    try{
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
    catch(err) {
        return BN(-Infinity);
    }
}
const getPriceFrom1InchApi = async (tokenIn, tokenOut, amountIn, network) => {
    let chainId = 1;
    if(network === 'Ropsten') chainId = 3;
    if(network === 'Rinkeby') chainId = 4;
    if(network === 'Goerli') chainId = 5;
    if(network === 'Kovan') chainId = 42;
    try{
        const res = await axios.get(`https://api.1inch.exchange/v4.0/${chainId}/quote`, {
            params: {
                fromTokenAddress: tokenIn,
                toTokenAddress: tokenOut,
                amount: amountIn.toFixed()
            }
        });
        return res.data;
    }
    catch(err) {
        console.log(err.message);
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
    toPrintable
}