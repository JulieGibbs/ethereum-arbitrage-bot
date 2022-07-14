import BN from 'bignumber.js';
import { Contract } from 'web3-eth-contract';
import { web3, network } from '../config';
import { AbiItem } from 'web3-utils';
import msIFactory from '../../abi/MooniFactory.json';
import msIRouter from '../../abi/MooniSwap.json';
import DEX from '../../config/dexs.json';


const mooniFactory = new web3.eth.Contract(msIFactory.abi as AbiItem[], DEX[network].MooniSwap.Factory);
export const getPriceOnMooni = async (amountIn: BN, tokenIn: string, tokenOut: string, pool: Contract) => {
    const encoded = pool.methods.getReturn(tokenIn, tokenOut, amountIn.toFixed()).encodeABI();
    return encoded;
};

export const getSwapOnMooni = async (amountIn: BN, amountOutMin: BN, path: string[], referral: string, recipient: string, pool: Contract) => {
    const encoded = pool.methods.swapFor(
        path[0],
        path[1],
        amountIn.toFixed(),
        amountOutMin.toFixed(),
        referral,
        recipient
    ).encodeABI();
    return encoded;
}

export const getMooniSwap = async (tokenIn: string, tokenOut: string) => {
    const mooniPool = await mooniFactory.methods.pools(tokenIn, tokenOut).call();
    return new web3.eth.Contract(msIRouter.abi as AbiItem[], mooniPool);
}