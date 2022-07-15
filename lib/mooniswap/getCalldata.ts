import BN from 'bignumber.js';
import { Contract } from 'web3-eth-contract';

export const getPriceOnMooni = async (amountIn: BN, tokenIn: string, tokenOut: string, pool: Contract) => {
    const encoded = pool.methods.getReturn(tokenIn, tokenOut, amountIn.toFixed()).encodeABI();
    return encoded;
};

export const getSwapOnMooni = async (amountIn: BN, amountOutMin: BN, path: string[], referral: string, recipient: string, pool: Contract) => {
    const encoded = pool.methods.swapFor(
        path[0],
        path[1],
        amountIn.toFixed(),
        amountOutMin.toFixed(),
        referral,
        recipient
    ).encodeABI();
    return encoded;
}