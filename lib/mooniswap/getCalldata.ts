import BN from 'bignumber.js';
import { Contract } from 'web3-eth-contract';
import { Token } from '../types';

export const getPriceOnMooni = (amountIn: BN, tokenIn: Token, tokenOut: Token, pool: Contract) => {
    const encoded = pool.methods.getReturn(tokenIn.address, tokenOut.address, amountIn.toFixed()).encodeABI();
    return encoded;
};

export const getSwapOnMooni = (amountIn: BN, amountOutMin: BN, tokenIn: Token, tokenOut: Token, recipient: string, pool: Contract) => {
    const encoded = pool.methods.swap(
        tokenIn.address,
        tokenOut.address,
        amountIn.toFixed(),
        amountOutMin.toFixed(),
        recipient
    ).encodeABI();
    return encoded;
}