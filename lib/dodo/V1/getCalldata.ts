import BN from 'bignumber.js';
import { Contract } from 'web3-eth-contract';
import { deadline } from '../../config';
import { ddV1Helper, ddV2Proxy, ZERO_ADDRESS } from '../../contracts';
import { Token } from '../../types';

export const getPriceOnDODOV1 = async (amountIn: BN, tokenIn: Token, tokenOut: Token, pool: Contract) => {
    // const pool = getDODOV1Pool(tokenIn, tokenOut);
    let baseToken = ZERO_ADDRESS;
    if (pool.options.address != ZERO_ADDRESS) baseToken = await pool.methods._BASE_TOKEN_().call();
    const encoded =
        baseToken == tokenIn.address
        ? ddV1Helper.methods.querySellBaseToken(pool.options.address, amountIn).encodeABI()
        : ddV1Helper.methods.querySellQuoteToken(pool.options.address, amountIn).encodeABI();
    return encoded;
};
export const getSwapOnDODOV1 = async (amountIn: BN, amountOutMin: BN, tokenIn: Token, tokenOut: Token, recipient: string, pool: Contract) => {
    // const pool = getDODOV1Pool(tokenIn, tokenOut);
    const direction = await pool.methods._BASE_TOKEN_().call() == tokenIn.address ? 0 : 1;
    const encoded = ddV2Proxy.methods.dodoSwapV1(
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