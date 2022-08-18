import BN from 'bignumber.js';
import { Contract } from 'web3-eth-contract';
import { deadline } from '../../config';
import { flashSwap, getDODOV2Pool } from '../../contracts';
import { Token } from '../../types';

export const getPriceOnDODOV2 = async (amountIn: BN, tokenIn: Token, tokenOut: Token) => {
    const pool = getDODOV2Pool(tokenIn, tokenOut);
    const baseToken = await pool.methods._BASE_TOKEN_();
    const encoded =
        baseToken.toLowerCase() === tokenIn.address.toLowerCase()
        ? pool.methods.querySellBase(flashSwap.options.address, amountIn)[0].encodeABI()
        : pool.methods.querySellQuote(flashSwap.options.address, amountIn)[0].encodeABI();
    return encoded;
};
export const getSwapOnDODOV2 = async (amountIn: BN, amountOutMin: BN, tokenIn: Token, tokenOut: Token, recipient: string, DODOV2Proxy: Contract) => {
    const pool = getDODOV2Pool(tokenIn, tokenOut);
    const direction = await pool.methods._BASE_TOKEN_() == tokenIn.address ? 0 : 1;
    const encoded = DODOV2Proxy.methods.dodoSwapV2TokenToToken(
        tokenIn.address,
        tokenOut.address,
        amountIn,
        amountOutMin,
        [pool.options.address],
        direction,
        false,
        (new Date().getTime() / 1000 + deadline).toFixed(0)
    ).encodeABI();
    return encoded;
}