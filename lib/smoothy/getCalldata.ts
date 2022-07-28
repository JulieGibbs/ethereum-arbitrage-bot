import BN from 'bignumber.js';
import { Contract } from 'web3-eth-contract';
import { deadline } from '../config';
import { Token } from '../types';
import TOKEN from '../../config/mainnet.json';
export const smoothyTokens: Token[] = [TOKEN.USDC, TOKEN.USDT, ]
export const getPriceOnUniV2 = (amountIn: BN, tokenIn: Token, tokenOut: Token, router: Contract) => {
    const encoded = router.methods.getAmountsOut(amountIn.toFixed(), [tokenIn.address, tokenOut.address]).encodeABI();
    return encoded;
};

export const getSwapOnUniV2 = (amountIn: BN, amountOutMin: BN, tokenIn: Token, tokenOut: Token, recipient: string, router: Contract) => {
    const encoded = router.methods.swapExactTokensForTokens(
        amountIn.toFixed(),
        amountOutMin.toFixed(),
        [tokenIn.address, tokenOut.address],
        recipient,
        (new Date().getTime() / 1000 + deadline).toFixed(0)
    ).encodeABI();
    return encoded;
}