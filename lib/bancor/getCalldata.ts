import BN from 'bignumber.js';
import { deadline } from '../config';
import { bcQuoter, bcRouter } from '../contracts';

export const getPriceOnBancorV3 = (amountIn: BN, tokenIn: string, tokenOut: string) => {
    const encoded = bcQuoter.methods.tradeOutputBySourceAmount(tokenIn, tokenOut, amountIn.toFixed()).encodeABI();
    return encoded;
};

export const getSwapOnBancorV3 = (amountIn: BN, amountOutMin: BN, path: string[], recipient: string) => {
    const encoded = bcRouter.methods.tradeBySourceAmount(
        path[0],
        path[1],
        amountIn.toFixed(),
        amountOutMin.toFixed(),
        (new Date().getTime() / 1000 + deadline).toFixed(0),
        recipient
    ).encodeABI();
    return encoded;
}