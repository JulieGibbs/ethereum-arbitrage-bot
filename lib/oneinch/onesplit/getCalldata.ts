import BN from 'bignumber.js';
import { Contract } from 'web3-eth-contract';

export const getPriceOnOneSplit = (amountIn: BN, tokenIn: string, tokenOut: string, router: Contract) => {
    const encoded = router.methods.getExpectedReturn(tokenIn, tokenOut, amountIn.toFixed(), 100, 0).encodeABI();
    return encoded;
};

export const getSwapOnOneSplit = (amountIn: BN, amountOutMin: BN, path: string[], distribution: string[], router: Contract) => {
    const encoded = router.methods.swap(
        path[0],
        path[1],
        amountIn.toFixed(),
        amountOutMin.toFixed(),
        distribution,  // distribution (uint256[]) Array of weights for volume distribution returned by `getExpectedReturn`
        0
    ).encodeABI();
    return encoded;
}