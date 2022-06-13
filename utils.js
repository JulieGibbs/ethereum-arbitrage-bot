const colors = require('colors');
const axios = require('axios');
const BN = require('bignumber.js');

/**
 * Given an input amount of an asset and pair reserves, returns the maximum output amount of the other asset.
 * @param {string | BigNumber} amountIn Input amount of token1
 * @param {string | BigNumber} reserveIn Reserve of token1
 * @param {string | BigNumber} reserveOut Reserve of token2
 * @returns Output amount of token2
 */
const getAmountOut = (amountIn, reserveIn, reserveOut) => {
    let amountInWithFee = BN(amountIn).times(997);
    let numerator = amountInWithFee.times(reserveOut);
    let denominator = BN(reserveIn).times(1000).plus(amountInWithFee);
    return numerator.idiv(denominator);
}

/**
 * Calculate token price.
 * @param {string | BigNumber} amountIn Input amount of token
 * @param {number} tokenId Index of token in token array
 * @param {Contract} pair Pair contract
 * @returns Output amount of token
 */
const getUniswapQuote = async (amountIn, tokenIn, tokenOut, pair) => {
    // If token pair contract is null address, return infinity
    if(pair.options.address === '0x0000000000000000000000000000000000000000') return BN(-Infinity);

    // Get reserves of tokens in pair contract.
    let reserves = await pair.methods.getReserves().call();
    let reserve1 = reserves[0], reserve2 = reserves[1];
    // In token pair contract, tokens is ordered by its address.
    if(tokenIn > tokenOut) [reserve1, reserve2] = [reserve2, reserve1];
    
    return getAmountOut(amountIn, reserve1, reserve2);
}

/**
 * Calculate token price.
 * @param {BigNumber} amountIn Input amount of token
 * @param {number} tokenId Index of token in token array
 * @param {Contract} pair Pair contract
 * @returns Output amount of token
 */
 const getUniswapV3Quote = async (amountIn, tokenIn, tokenOut, quoter) => {
    return await quoter.methods.quoteExactInputSingle(
        tokenIn,
        tokenOut,
        3000,
        amountIn.toFixed(),
        '0'
    ).call();
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

/**
 * 
 * @param {string | BigNumber} amount Amount of token
 * @param {number} decimal Decimal of token
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
    toPrintable
}