import BN from 'bignumber.js';
import { Contract } from 'web3-eth-contract';
import { swapFee, deadline, loanFee } from '../../config';
import { uni3Factory, uni2Factory } from '../../contracts'; 
import TOKEN from '../../../config/mainnet.json';
import { Token } from '../../types';


export const getPriceOnUniV3 = (amountIn: BN, tokenIn: Token, tokenOut: Token, quoter: Contract) => {
    const encoded = quoter.methods.quoteExactInputSingle(tokenIn.address, tokenOut.address, swapFee, amountIn.toFixed(), '0').encodeABI();
    return encoded;
};

export const getMaxFlashAmount3 = async (tokenIn: Contract) => {
    let otherToken = tokenIn.options.address === TOKEN.WETH.address ? TOKEN.DAI.address : TOKEN.WETH.address;
    console.log(loanFee * 1e6);
    // console.log(flashFactory.options.address);
    try {
        const flashPool = await uni3Factory.methods.getPool(tokenIn.options.address, otherToken, loanFee * 1e6).call();
        const balance = await tokenIn.methods.balanceOf(flashPool).call();
        const maxAmount = balance ? new BN(balance) : new BN(0);
        return maxAmount;
    } catch (err){
        console.log('Flash pool is not exist!'.red);
    }
};
export const getMaxFlashAmount2 = async (tokenIn: Contract) => {
    let otherToken = tokenIn.options.address === TOKEN.WETH.address ? TOKEN.DAI.address : TOKEN.WETH.address;
    // console.log(tokenIn.options.address);
    // console.log(uni2Factory.options.address);
    try {
        const flashPool = await uni2Factory.methods.getPair(tokenIn.options.address, otherToken).call();
        const balance = await tokenIn.methods.balanceOf(flashPool).call();
        const maxAmount = balance ? new BN(balance) : new BN(0);
        return maxAmount;
    } catch (err){
        console.log('Flash pool is not exist!'.red);
    }
};

export const getSwapOnUniv3 = (amountIn: BN, amountOutMin: BN, tokenIn: Token, tokenOut: Token, recipient: string, router: Contract) => {
    const param = {
        tokenIn: tokenIn.address,
        tokenOut: tokenOut.address,
        fee: swapFee,
        recipient: recipient,
        deadline: (new Date().getTime() / 1000 + deadline).toFixed(0),
        amountIn: amountIn.toFixed(),
        amountOutMinimum: amountOutMin.toFixed(),
        sqrtPriceLimitX96: 0
    }
    const encoded = router.methods.exactInputSingle(param).encodeABI();
    return encoded;
}