import BN from 'bignumber.js';
import { Contract } from 'web3-eth-contract';
import { deadline } from '../config';
import { Token } from '../types';

export const getPriceOnBancorV3 = (amountIn: BN, tokenIn: Token, tokenOut: Token, quoter: Contract) => {
    const encoded = quoter.methods.tradeOutputBySourceAmount(tokenIn.address, tokenOut.address, amountIn.toFixed()).encodeABI();
    return encoded;
};

export const getSwapOnBancorV3 = (amountIn: BN, amountOutMin: BN, tokenIn: Token, tokenOut: Token, recipient: string, router: Contract) => {
    const encoded = router.methods.tradeBySourceAmount(
        tokenIn.address,
        tokenOut.address,
        amountIn.toFixed(),
        amountOutMin.toFixed(),
        (new Date().getTime() / 1000 + deadline).toFixed(0),
        recipient
    ).encodeABI();
    return encoded;
}