import colors from 'colors';
import axios from 'axios';
import BN from 'bignumber.js';
import { Contract } from 'web3-eth-contract';
import { Network } from './types';

/**
 * Get UniswapV2, Sushiswap, Shibaswap quote.
 * @param amountIn Input amount of token.
 * @param tokenIn Input token address.
 * @param tokenOut Output token address.
 * @param router Router contract.
 * @returns Output amount of token.
 */
export const getUniswapQuote = async (amountIn: BN, tokenIn: string, tokenOut: string, router: Contract) => {
    try {
        let amountOuts = await router.methods.getAmountsOut(amountIn.toFixed(), [tokenIn, tokenOut]).call();
        return new BN(amountOuts[1]);
    }
    catch (err) {
        return new BN(-Infinity);
    }
}
export const getMooniswapQuote = async (amountIn: BN, tokenIn: string, tokenOut: string, quoter: Contract) => {
    try {
        let amountOut = await quoter.methods.getReturn(tokenIn, tokenOut, amountIn).call();
        return new BN(amountOut);
    }
    catch (err) {
        return new BN(-Infinity);
    }
}
export const getDodoVMQuote = async (amountIn: BN, tokenIn: string, tokenOut: string, quoter: Contract, account: string) => {
    try {
        let [amountOut,] = await quoter.methods.querySellBase(account, amountIn).call();
        console.log(amountOut);

        return new BN(amountOut);
    }
    catch (err) {
        return new BN(-Infinity);
    }
}

/**
 * Get UniswapV3 quote.
 * @param amountIn Input amount of token.
 * @param tokenIn Input token address.
 * @param tokenOut Output token address.
 * @param quoter Quoter contract.
 * @returns Output amount of token.
 */
export const getUniswapV3Quote = async (amountIn: BN, tokenIn: string, tokenOut: string, quoter: Contract) => {
    try {
        let amountOut = await quoter.methods.quoteExactInputSingle(
            tokenIn,
            tokenOut,
            3000,
            amountIn.toFixed(),
            '0'
        ).call();
        return new BN(amountOut);
    }
    catch (err) {
        return new BN(-Infinity);
    }
}

/**
 * Get Kyber quote.
 * @param amountIn Input amount of token.
 * @param tokenIn Input token address.
 * @param tokenOut Output token address.
 * @param quoter Quoter contract.
 * @returns Output amount of token.
 */
export const getKyberQuote = async (amountIn: BN, tokenIn: string, tokenOut: string, quoter: Contract) => {
    try {
        const quoteOut = await quoter.methods.quoteExactInputSingle(
            {
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                feeUnits: 3000,
                amountIn: amountIn.toFixed(),
                limitSqrtP: '0'
            }
        ).call();
        return new BN(quoteOut.returnedAmount);
    }
    catch (err) {
        return new BN(-Infinity);
    }
}

/**
 * Get Balancer quote.
 * @param amountIn Input amount of token.
 * @param tokenIn Input token address.
 * @param tokenOut Output token address.
 * @param quoter Quoter contract.
 * @returns Output amount of token.
 */
export const getBalancerQuote = async (amountIn: BN, tokenIn: string, tokenOut: string, quoter: Contract) => {
    const pool_WETH_USDC = "0x3a19030ed746bd1c3f2b0f996ff9479af04c5f0a000200000000000000000004";
    const tokenPath = [tokenIn, tokenOut];
    const swap_steps_struct: any[] = [];

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
        return new BN(quoteOut[tokenPath.length - 1]);
    }
    catch (err) {
        return new BN(-Infinity);
    }
}

/**
 * Get dex path and quote.
 * @param amountIn Input amount of token.
 * @param tokenIn Input token address.
 * @param tokenOut Output token address.
 * @param network Network name.
 * @returns Best dex path and quote.
 */
export const getPriceFrom1InchApi = async (amountIn: BN, tokenIn: string, tokenOut: string, network: Network) => {
    let chainId = 1;
    if (network === 'ropsten') chainId = 3;
    if (network === 'rinkeby') chainId = 4;
    if (network === 'goerli') chainId = 5;
    if (network === 'kovan') chainId = 42;
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
 * Get dex path and quote.
 * @param amountIn Input amount of token.
 * @param tokenIn Input token address.
 * @param tokenOut Output token address.
 * @param network Network name.
 * @param flashswap FlashSwap address.
 * @returns Best dex path and quote.
 */
export const getSwapFrom1InchApi = async (amountIn: BN, tokenIn: string, tokenOut: string, network: Network, flashswap: string) => {
    let chainId = 1;
    if (network === 'ropsten') chainId = 3;
    if (network === 'rinkeby') chainId = 4;
    if (network === 'goerli') chainId = 5;
    if (network === 'kovan') chainId = 42;
    try {
        const res = await axios.get(`https://api.1inch.exchange/v4.0/${chainId}/swap`, {
            params: {
                fromTokenAddress: tokenIn,
                toTokenAddress: tokenOut,
                amount: amountIn.toFixed(),
                fromAddress: flashswap,
                slippage: 1,
                disableEstimate: true
            }
        });
        return res.data;
    }
    catch (err) {
        return null;
    }
}

/**
 * Stringify big number.
 * @param amount Wei amount.
 * @param decimal Decimal of token.
 * @param fixed Fixed number.
 * @returns Stringified number.
 */
export const toPrintable = (amount: BN, decimal: number, fixed: number) => {
    return amount.isFinite()
        ? amount.div(new BN(10).pow(decimal)).toFixed(fixed).yellow
        : 'N/A'.yellow;
}
