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
import FlashSwap2 from '../abi/Uniswap2Flash.json';
import FlashSwap3 from '../abi/Uniswap3Flash.json';
import UniV3Factory from '../abi/UniswapV3Factory.json';
import UniV2Factory from '../abi/UniswapV2Factory.json';
import UniV1Factory from '../abi/UniswapV1Factory.json';
import un3IQuoter from '../abi/UniswapV3IQuoter.json';
import un3IRouter from '../abi/UniswapV3Router.json';
import un2IRouter from '../abi/UniswapV2Router02.json';
import un1IExchange from '../abi/UniV1Exchange.json';
import lkIRouter from '../abi/LinkSwapRouter.json';
import mnIFactory from '../abi/MooniFactory.json';
import mnIRouter from '../abi/MooniSwap.json';
import bcIQuoter from '../abi/BancorNetworkInfo.json';
import bcIRouter from '../abi/BancorNetwork.json';

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
export const ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
// export const flashSwap = new web3.eth.Contract(FlashSwap2.abi as AbiItem[], process.env.FORK_CONTRACT_ADDRESS);
export const flashSwap = new web3.eth.Contract(FlashSwap3.abi as AbiItem[], process.env.MAINNET_CONTRACT_ADDRESS);
export const offchainOracle = new web3.eth.Contract(IOracle.abi as AbiItem[], DEX[network].OneInchOracle.Oracle);
export const uni3Factory = new web3.eth.Contract(UniV3Factory.abi as AbiItem[], DEX[network].UniswapV3.Factory);
export const uni2Factory = new web3.eth.Contract(UniV2Factory.abi as AbiItem[], DEX[network].UniswapV2.Factory);
export const uni1Factory = new web3.eth.Contract(UniV1Factory.abi as AbiItem[], DEX[network].UniswapV1.Factory);
export const un3Quoter = new web3.eth.Contract(un3IQuoter.abi as AbiItem[], DEX[network].UniswapV3.Quoter);
export const un3Router = new web3.eth.Contract(un3IRouter.abi as AbiItem[], DEX[network].UniswapV3.Router);
export const multicall = new web3.eth.Contract(IMulticall as AbiItem[], DEX[network].UniswapV3.Multicall2);
export const un2Router =  new web3.eth.Contract(un2IRouter.abi as AbiItem[], DEX[network].UniswapV2.Router);
export const suRouter = new web3.eth.Contract(un2IRouter.abi as AbiItem[], DEX[network].Sushiswap.Router);
export const shRouter = new web3.eth.Contract(un2IRouter.abi as AbiItem[], DEX[network].Shibaswap.Router);
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
export const getUniV1Exchange = async (token: Token) => {
    const exchangeAddr = await uni1Factory.methods.getExchange(token.address).call();
    return new web3.eth.Contract(un1IExchange.abi as AbiItem[], exchangeAddr);
}