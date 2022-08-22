import BN from 'bignumber.js';
import { Contract } from 'web3-eth-contract';
import { deadline } from '../../config';
import { Token } from '../../types';
/**
 * Get Balancer quote.
 * @param amountIn Input amount of token.
 * @param tokenIn Input token address.
 * @param tokenOut Output token address.
 * @param quoter Quoter contract.
 * @returns Output amount of token.
 */
export const getPriceOnBalancerV1 = (amountIn: BN, tokenIn: Token, tokenOut: Token, quoter: Contract) => {
    const pool_WETH_USDC = "0x3a19030ed746bd1c3f2b0f996ff9479af04c5f0a000200000000000000000004";
    const tokenPath = [tokenIn, tokenOut];
    const swap_steps_struct: any[] = [];

    for (var i = 0; i < tokenPath.length - 1; i++) {
        const swap_struct =
        {
            poolId: pool_WETH_USDC,
            assetInIndex: i,
            assetOutIndex: i + 1,
            amount: amountIn.toFixed(),
            userData: '0x'
        };
        swap_steps_struct.push(swap_struct);
    }

    const fund_struct = {
        sender: "0xB7Bb04e5D6a6493f79b36d2E9c2D94a26d731b94",
        fromInternalBalance: false,
        recipient: "0xB7Bb04e5D6a6493f79b36d2E9c2D94a26d731b94",
        toInternalBalance: false
    };

    try {
        const quoteOut = quoter.methods.queryBatchSwap(
            0,
            swap_steps_struct,
            tokenPath,
            fund_struct
        ).call();
        return new BN(quoteOut[tokenPath.length - 1]);
    }
    catch (err) {
        return new BN(-Infinity);
    }
}

export const getSwapOnBalancerV1 = (amountIn: BN, amountOutMin: BN, tokenIn: Token, tokenOut: Token, recipient: string, router: Contract) => {
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