import BN from 'bignumber.js';
import { Contract } from 'web3-eth-contract';
import { deadline } from '../../config';
import { getUniV1Exchange } from '../../contracts';
import { Token } from '../../types';
export const getPriceOnUniV1 = async (amountIn: BN, tokenIn: Token, tokenOut: Token): Promise<[Contract, Contract, any]> => {
    const [exchangeA, ethPrice] = await getTokenToEthPrice(amountIn, tokenIn);
    const [exchangeB, tokenPrice] = await getEthToTokenPrice(ethPrice, tokenOut)
    // console.log(exchangeA.options.address);
    return [exchangeA, exchangeB, tokenPrice];
};
export const getTokenToEthPrice = async (amount: BN, token: Token): Promise<[Contract, BN]> => {
    const exchange = await getUniV1Exchange(token);
    try {
        const ethPrice = await exchange.methods.getTokenToEthInputPrice(amount.toFixed()).call();
        return [exchange, new BN(ethPrice)];
    } catch (err) {
        // console.log(err.message);
        return [exchange, new BN(0)];
    }
    
}
export const getEthToTokenPrice = async (amount: BN, token: Token): Promise<[Contract, any]> => {
    const exchange = await getUniV1Exchange(token);
    const tokenPrice = await exchange.methods.getEthToTokenInputPrice(amount.toFixed()).encodeABI();
    return [exchange, tokenPrice];
}
export const getSwapOnUniV1 = (amountIn: BN, amountOutMin: BN, tokenIn: Token, tokenOut: Token, recipient: string, router: Contract) => {
    // const [, ethPrice] = await getTokenToEthPrice(amountIn, tokenIn);
    const encoded = router.methods.tokenToTokenTransferInput(
        amountIn.toFixed(),
        amountOutMin.toFixed(),
        new BN(1e9).toFixed(),
        (new Date().getTime() / 1000 + deadline).toFixed(0),
        recipient,
        tokenOut.address
    ).encodeABI();
    return encoded;
}