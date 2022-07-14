import BN from 'bignumber.js';
import { Contract } from 'web3-eth-contract';
import { swapFee, deadline } from '../../config';
import { flashFactory, un3Quoter, un3Router } from '../../contracts'; 
import TOKEN from '../../../config/mainnet.json';


export const getPriceOnUniV3 = (amountIn: BN, tokenIn: string, tokenOut: string) => {
    const encoded = un3Quoter.methods.quoteExactInputSingle(tokenIn, tokenOut, swapFee, amountIn.toFixed(), '0').encodeABI();
    return encoded;
};

export const getMaxFlashAmount = async (tokenIn: Contract) => {
    let otherToken = tokenIn.options.address === TOKEN.WETH.address ? TOKEN.DAI.address : TOKEN.WETH.address;

    try {
        const flashPool = await flashFactory.methods.getPool(tokenIn.options.address, otherToken, 500).call();
        const balance = await tokenIn.methods.balanceOf(flashPool).call();
        const maxAmount = balance ? new BN(balance) : new BN(0);
        return maxAmount;
    } catch (err){
        console.log('Flash pool is not exist!');
    }
};

export const getSwapOnUniv3 = (amountIn: BN, amountOutMin: BN, path: string[], recipient: string) => {
    const param = {
        tokenIn: path[0],
        tokenOut: path[1],
        fee: swapFee,
        recipient: recipient,
        deadline: (new Date().getTime() / 1000 + deadline).toFixed(0),
        amountIn: amountIn.toFixed(),
        amountOutMinimum: amountOutMin.toFixed(),
        sqrtPriceLimitX96: 0
    }
    const encoded = un3Router.methods.exactInputSingle(param).encodeABI();
    return encoded;
}