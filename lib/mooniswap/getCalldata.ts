import BN from 'bignumber.js';
import { Contract } from 'web3-eth-contract';

export const getPriceOnMooni = (amountIn: BN, tokenIn: string, tokenOut: string, pool: Contract) => {
    const encoded = pool.methods.getReturn(tokenIn, tokenOut, amountIn.toFixed()).encodeABI();
    return encoded;
};

export const getSwapOnMooni = (amountIn: BN, amountOutMin: BN, path: string[], recipient: string, pool: Contract) => {
    const encoded = pool.methods.swap(
        path[0],
        path[1],
        amountIn.toFixed(),
        amountOutMin.toFixed(),
        recipient
    ).encodeABI();
    return encoded;
}