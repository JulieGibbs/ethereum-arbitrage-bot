import BN from 'bignumber.js';
import { Contract } from 'web3-eth-contract';
import { config as dotEnvConfig } from "dotenv";
dotEnvConfig();
const recipient = process.env.FLASHSWAP_ADDRESS || '';
export const getPriceOnUniV3 = (amountIn: BN, tokenIn: string, tokenOut: string, router: Contract) => {
    const encoded = router.methods.quoteExactInputSingle(tokenIn, tokenOut, 3000, amountIn.toFixed(), '0').encodeABI();
    return encoded;
};
export const getSwapOnUniv3 = (amountIn: BN, amountOutMin: BN, path: string[], router: Contract) => {
    const deadline = 300;
    const param = {
        tokenIn: path[0],
        tokenOut: path[1],
        fee: 3000,
        recipient: recipient,
        deadline: (new Date().getTime() / 1000 + deadline).toFixed(0),
        amountIn: amountIn.toFixed(),
        amountOutMinimum: amountOutMin.toFixed(),
        sqrtPriceLimitX96: 0
    }
    const encoded = router.methods.exactInputSingle(param).encodeABI();
    return encoded;
}