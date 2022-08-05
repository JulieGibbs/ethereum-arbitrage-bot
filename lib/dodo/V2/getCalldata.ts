import BN from 'bignumber.js';
import { Contract } from 'web3-eth-contract';
import { deadline } from '../../config';
import { DODOV2POOLS } from "../constants";
import { flashloanAddress, dodoProxy, dodoApprove } from '../constants';
export const getDODOV2Pool = (tokenIn: string, tokenOut: string) => {
    const pair = [tokenIn, tokenOut].sort();
  
    for (const dodoPair of DODOV2POOLS) {
        if (dodoPair.address.join() === pair.join()) {
            return dodoPair.address[0];
        }
    }
    throw new Error(`Could not find pool for ${pair.join()}`);
};
export const getPriceOnDODOV2 = async (amountIn: BN, tokenIn: string, tokenOut: string, DODOV2: Contract) => {
    const baseToken = await DODOV2.methods._BASE_TOKEN_();
    const encoded =
        baseToken.toLowerCase() === tokenIn.toLowerCase()
        ? DODOV2.methods.querySellBase(flashloanAddress, amountIn)[0].encodeABI()
        : DODOV2.methods.querySellQuote(flashloanAddress, amountIn)[0].encodeABI();
    return encoded;
};
export const getSwapOnDODOV2 = async (amountIn: BN, amountOutMin: BN, path: string[], DODOV2: Contract, DODOV2Proxy: Contract) => {
    const direction = await DODOV2.methods._BASE_TOKEN_() == path[0] ? 0 : 1;
    const encoded = DODOV2Proxy.methods.dodoSwapV2TokenToToken(
        path[0],
        path[1],
        amountIn,
        amountOutMin,
        [DODOV2.options.address],
        direction,
        false,
        (new Date().getTime() / 1000 + deadline).toFixed(0)
    ).encodeABI();
    return encoded;
}