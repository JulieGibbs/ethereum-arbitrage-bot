import * as dotenv from 'dotenv';
import { web3, network } from './config';
import { AbiItem } from 'web3-utils';
import IERC20 from '../abi/ERC20.json';
import IOracle from '../abi/OffchainOracle.json';
import FlashSwap from '../abi/UniswapFlash.json';
import UniV3Factory from '../abi/UniswapV3Factory.json';
import un3IQuoter from '../abi/UniswapV3IQuoter.json';
import un3IRouter from '../abi/UniswapV3Router.json';
import un2IRouter from '../abi/UniswapV2Router02.json';
import lkIRouter from '../abi/LinkSwapRouter.json';
import osIRouter from '../abi/OneSplit.json';
import msIFactory from '../abi/MooniFactory.json';
import msIRouter from '../abi/MooniSwap.json';

import bsIRouter from '../abi/BalancerVault.json';
// import kbIQuoter from '../abi/KyberQuoter.json';

import IMulticall from '../abi/UniswapV3Multicall2.json';
import DEX from '../config/dexs.json';
dotenv.config({ path: __dirname + '/../.env' });
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
// flash swap contract
export const flashSwap = new web3.eth.Contract(FlashSwap.abi as AbiItem[], process.env.MAINNET_CONTRACT_ADDRESS);
// oracle contract
export const offchainOracle = new web3.eth.Contract(IOracle.abi as AbiItem[], DEX[network].OneInchOracle.Oracle);
// UniswapV3 contracts
export const flashFactory = new web3.eth.Contract(UniV3Factory.abi as AbiItem[], DEX[network].UniswapV3.Factory);
export const un3Quoter = new web3.eth.Contract(un3IQuoter.abi as AbiItem[], DEX[network].UniswapV3.Quoter);
export const un3Router = new web3.eth.Contract(un3IRouter.abi as AbiItem[], DEX[network].UniswapV3.Router);
export const multicall = new web3.eth.Contract(IMulticall as AbiItem[], DEX[network].UniswapV3.Multicall2);
// UniswapV2 contract
export const un2Router =  new web3.eth.Contract(un2IRouter.abi as AbiItem[], DEX[network].UniswapV2.Router);
// SushiSwap contract
export const suRouter = new web3.eth.Contract(un2IRouter.abi as AbiItem[], DEX[network].SushiswapV2.Router);
// ShibaSwap contract
export const shRouter = new web3.eth.Contract(un2IRouter.abi as AbiItem[], DEX[network].ShibaswapV2.Router);
// DefiSwap contract
export const dfRouter = new web3.eth.Contract(un2IRouter.abi as AbiItem[], DEX[network].DefiSwap.Router);
// LinkSwap contract
export const lkRouter = new web3.eth.Contract(lkIRouter.abi as AbiItem[], DEX[network].LinkSwap.Router);
// Mooniswap contract
export const mooniFactory = new web3.eth.Contract(msIFactory.abi as AbiItem[], DEX[network].MooniSwap.Factory);
export const getMooniSwap = async (tokenIn: string, tokenOut: string) => {
    let mooniPool = await mooniFactory.methods.pools(tokenIn, tokenOut).call();
    return new web3.eth.Contract(msIRouter.abi as AbiItem[], mooniPool);
}
// ERC20 contract
export const getERC20Contract = (token: string) => {
    return new web3.eth.Contract(IERC20.abi as AbiItem[], token);
}