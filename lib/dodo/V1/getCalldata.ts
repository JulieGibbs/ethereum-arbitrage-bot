import BN from 'bignumber.js';
import { Contract } from 'web3-eth-contract';
import { deadline } from '../../config';
import { getDODOV1Pool } from '../../contracts';
import { Token } from '../../types';

export const getPriceOnDODOV1 = async (amountIn: BN, tokenIn: Token, tokenOut: Token, helper: Contract) => {
    const pool = getDODOV1Pool(tokenIn, tokenOut);
    const baseToken = await pool.methods._BASE_TOKEN_();
    const encoded =
        baseToken === tokenIn.address
        ? helper.methods.querySellBaseToken(pool.options.address, amountIn).encodeABI()
        : helper.methods.querySellQuoteToken(pool.options.address, amountIn).encodeABI();
    return encoded;
};
export const getSwapOnDODOV1 = async (amountIn: BN, amountOutMin: BN, tokenIn: Token, tokenOut: Token, recipient: string, DODOV2Proxy: Contract) => {
    const pool = getDODOV1Pool(tokenIn, tokenOut);
    const direction = await pool.methods._BASE_TOKEN_() == tokenIn.address ? 0 : 1;
    const encoded = DODOV2Proxy.methods.dodoSwapV1(
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