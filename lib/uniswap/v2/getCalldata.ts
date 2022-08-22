import BN from 'bignumber.js';
import { Contract } from 'web3-eth-contract';
import { deadline } from '../../config';
import { Token } from '../../types';

export const getPriceOnUniV2 = (amountIn: BN, path: string[], router: Contract) => {
    const encoded = router.methods.getAmountsOut(amountIn.toFixed(), path).encodeABI();
    return encoded;
};

export const getSwapOnUniV2 = (amountIn: BN, amountOutMin: BN, path: string[], recipient: string, router: Contract) => {
    const encoded = router.methods.swapExactTokensForTokens(
        amountIn.toFixed(),
        amountOutMin.toFixed(),
        path,
        recipient,
        (new Date().getTime() / 1000 + deadline).toFixed(0)
    ).encodeABI();
    return encoded;
}