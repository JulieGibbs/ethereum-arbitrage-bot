import BN from 'bignumber.js';
import { Contract } from 'web3-eth-contract';
import Web3 from 'web3';
import { AbiItem } from 'web3-utils';
import msIRouter from '../../abi/MooniSwap.json';

export const getPriceOnMooni = (amountIn: BN, tokenIn: string, tokenOut: string, router: Contract) => {
    const encoded = router.methods.getReturn(tokenIn, tokenOut, amountIn.toFixed()).encodeABI();
    return encoded;
};

export const getSwapOnMooni = (amountIn: BN, amountOutMin: BN, path: string[], referral: string, recipient: string, router: Contract) => {
    const encoded = router.methods.swapFor(
        path[0],
        path[1],
        amountIn.toFixed(),
        amountOutMin.toFixed(),
        referral,
        recipient
    ).encodeABI();
    return encoded;
}

export const getMooniSwap = async (tokenIn: string, tokenOut: string, factory: Contract, web3: Web3) => {
    const mooniPool = await factory.methods.pools(tokenIn, tokenOut).call();
    return new web3.eth.Contract(msIRouter.abi as AbiItem[], mooniPool);
}