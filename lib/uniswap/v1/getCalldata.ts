import BN from 'bignumber.js';
import { Contract } from 'web3-eth-contract';
import { deadline } from '../../config';
import { getUniV1Exchange } from '../../contracts';
import { Token } from '../../types';
export const getPriceOnUniV1 = async (amountIn: BN, tokenIn: Token, tokenOut: Token) => {
    const [exchangeA, ethPrice] = await getTokenToEthPrice(amountIn, tokenIn);
    const [exchangeB, tokenPrice] = await getEthToTokenPrice(ethPrice, tokenOut)
    return [exchangeA, exchangeB, tokenPrice];
};
export const getTokenToEthPrice = async (amountIn: BN, token: Token) => {
    const exchange = await getUniV1Exchange(token);
    const ethPrice = await exchange.methods.getTokenToEthInputPrice(amountIn.toFixed()).call();
    return [exchange, ethPrice];
}
export const getEthToTokenPrice = async (amountIn: BN, token: Token) => {
    const exchange = await getUniV1Exchange(token);
    const tokenPrice = await exchange.methods.getEthToTokenInputPrice(amountIn.toFixed()).encodeABI();
    return [exchange, tokenPrice];
}
export const getSwapOnUniV1 = async (amountIn: BN, amountOutMin: BN, tokenIn: Token, tokenOut: Token, router: Contract) => {
    // const [, ethPrice] = await getTokenToEthPrice(amountIn, tokenIn);
    const encoded = router.methods.tokenToTokenSwapInput(
        amountIn.toFixed(),
        amountOutMin.toFixed(),
        new BN(1e9).toFixed(),
        (new Date().getTime() / 1000 + deadline).toFixed(0),
        tokenOut.address
    ).encodeABI();
    return encoded;
}