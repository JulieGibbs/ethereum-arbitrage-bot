import BN from 'bignumber.js';
import { Contract } from 'web3-eth-contract';
import { deadline } from '../config';
import { Token } from '../types';
import TOKEN from '../../config/mainnet.json';
const smoothyTokens: Token[] = [TOKEN.USDC, TOKEN.USDT, TOKEN.DAI, TOKEN.TUSD, TOKEN.SUSD, TOKEN.BUSD, TOKEN.USDP, TOKEN.GUSD];

export const getTokenIndex = (token: Token) => {
    const index = smoothyTokens.indexOf(token);
    if(index < 0) return 100;
    return index;
}
export const getPriceOnSmoothy = (amountIn: BN, tokenIn: Token, tokenOut: Token, router: Contract) => {
    const encoded = router.methods.getSwapAmount(getTokenIndex(tokenIn), getTokenIndex(tokenOut), amountIn.toFixed()).encodeABI();
    return encoded;
};

export const getSwapOnSmoothy = (amountIn: BN, amountOutMin: BN, tokenIn: Token, tokenOut: Token, recipient: string, router: Contract) => {
    const encoded = router.methods.swap(
        getTokenIndex(tokenIn),
        getTokenIndex(tokenOut),
        amountIn.toFixed(),
        amountOutMin.toFixed()
    ).encodeABI();
    return encoded;
}