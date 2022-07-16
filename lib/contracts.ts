import 'dotenv/config';
import { web3, network } from './config';
import { AbiItem } from 'web3-utils';
import { Token } from './types';

import DEX from '../config/dexs.json';
import Chainlink from '../config/chainlink.json';

import IERC20 from '../abi/ERC20.json';
import IMulticall from '../abi/UniswapV3Multicall2.json';
import IOracle from '../abi/OffchainOracle.json';
import IChainLink from '../abi/Chainlink.json';
import FlashSwap from '../abi/UniswapFlash.json';
import UniV3Factory from '../abi/UniswapV3Factory.json';
import un3IQuoter from '../abi/UniswapV3IQuoter.json';
import un3IRouter from '../abi/UniswapV3Router.json';
import un2IRouter from '../abi/UniswapV2Router02.json';
import lkIRouter from '../abi/LinkSwapRouter.json';
import mnIFactory from '../abi/MooniFactory.json';
import mnIRouter from '../abi/MooniSwap.json';
import bcIQuoter from '../abi/BancorNetworkInfo.json';
import bcIRouter from '../abi/BancorNetwork.json';

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
export const flashSwap = new web3.eth.Contract(FlashSwap.abi as AbiItem[], process.env.MAINNET_CONTRACT_ADDRESS);
export const offchainOracle = new web3.eth.Contract(IOracle.abi as AbiItem[], DEX[network].OneInchOracle.Oracle);
export const flashFactory = new web3.eth.Contract(UniV3Factory.abi as AbiItem[], DEX[network].UniswapV3.Factory);
export const un3Quoter = new web3.eth.Contract(un3IQuoter.abi as AbiItem[], DEX[network].UniswapV3.Quoter);
export const un3Router = new web3.eth.Contract(un3IRouter.abi as AbiItem[], DEX[network].UniswapV3.Router);
export const multicall = new web3.eth.Contract(IMulticall as AbiItem[], DEX[network].UniswapV3.Multicall2);
export const un2Router =  new web3.eth.Contract(un2IRouter.abi as AbiItem[], DEX[network].UniswapV2.Router);
export const suRouter = new web3.eth.Contract(un2IRouter.abi as AbiItem[], DEX[network].SushiswapV2.Router);
export const shRouter = new web3.eth.Contract(un2IRouter.abi as AbiItem[], DEX[network].ShibaswapV2.Router);
export const dfRouter = new web3.eth.Contract(un2IRouter.abi as AbiItem[], DEX[network].DefiSwap.Router);
export const lkRouter = new web3.eth.Contract(lkIRouter.abi as AbiItem[], DEX[network].LinkSwap.Router);
export const mnFactory = new web3.eth.Contract(mnIFactory.abi as AbiItem[], DEX[network].MooniSwap.Factory);
export const bcQuoter = new web3.eth.Contract(bcIQuoter.abi as AbiItem[], DEX[network].BancorV3.Quoter);
export const bcRouter = new web3.eth.Contract(bcIRouter.abi as AbiItem[], DEX[network].BancorV3.Router);
export const getMooniSwapContract = async (tokenIn: Token, tokenOut: Token) => {
    let mooniPool = await mnFactory.methods.pools(tokenIn.address, tokenOut.address).call();
    return new web3.eth.Contract(mnIRouter.abi as AbiItem[], mooniPool);
}
export const getERC20Contract = (token: Token) => {
    return new web3.eth.Contract(IERC20.abi as AbiItem[], token.address);
}
export const getChainlinkContract = (token: Token) => Chainlink[token.symbol] ?
    new web3.eth.Contract(IChainLink as AbiItem[], Chainlink[token.symbol]) : null;