import BN from 'bignumber.js';
import { Contract } from 'web3-eth-contract';

export const getPriceOnUniV2 = (amountIn: BN, tokenIn: string, tokenOut: string, router: Contract) => {
    const encoded = router.methods.getAmountsOut(amountIn.toFixed(), [tokenIn, tokenOut]).encodeABI();
    return encoded;
};

export const getSwapOnUniv2 = (amountIn: BN, amountOutMin: BN, path: string[], recipient: string, router: Contract) => {
    const deadline = 300;
    const encoded = router.methods.swapExactTokensForTokens(
        amountIn.toFixed(),
        amountOutMin.toFixed(),
        path,
        recipient,
        (new Date().getTime() / 1000 + deadline).toFixed(0)
    ).encodeABI();
    return encoded;
}