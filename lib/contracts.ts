import 'dotenv/config';
import { web3, network } from './config';
import { AbiItem } from 'web3-utils';
import { Token } from './types';
import DEXS from '../config/dexs.json';
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
import fxIRouter from '../abi/FraxSwapRouter.json';
import smIRouter from '../abi/SmoothySwap.json';
import ddV1Pool from '../abi/DODOV1.json';
import ddV2Pool from '../abi/DODOV2.json';
import ddV2IDVM from '../abi/DVMFactory.json';
import ddV2IDSP from '../abi/DSPFactory.json';
import ddV2IDPP from '../abi/DPPFactory.json';
import ddV2IDCP from '../abi/DCPFactory.json';
import ddV2IProxy from '../abi/DODOV2Proxy.json';
import ddIHelper from '../abi/DODOV1Helper.json'
import blV1IProxy from '../abi/BalancerV1Proxy.json';
import { DODOV1POOLS, DODOV2POOLS } from './dodo/constants';

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
export const ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
// export const flashSwap = new web3.eth.Contract(FlashSwap2.abi as AbiItem[], process.env.FORK_CONTRACT_ADDRESS);
export const flashSwap = new web3.eth.Contract(FlashSwap3.abi as AbiItem[], process.env.MAINNET_CONTRACT_ADDRESS);
export const offchainOracle = new web3.eth.Contract(IOracle.abi as AbiItem[], DEXS[network].OneInchOracle.Oracle);
export const uni3Factory = new web3.eth.Contract(UniV3Factory.abi as AbiItem[], DEXS[network].UniswapV3.Factory);
export const uni2Factory = new web3.eth.Contract(UniV2Factory.abi as AbiItem[], DEXS[network].UniswapV2.Factory);
// export const uni1Factory = new web3.eth.Contract(UniV1Factory.abi as AbiItem[], DEXS[network].UniswapV1.Factory);
export const un3Quoter = new web3.eth.Contract(un3IQuoter.abi as AbiItem[], DEXS[network].UniswapV3.Quoter);
export const un3Router = new web3.eth.Contract(un3IRouter.abi as AbiItem[], DEXS[network].UniswapV3.Router);
export const multicall = new web3.eth.Contract(IMulticall as AbiItem[], DEXS[network].UniswapV3.Multicall2);
export const un2Router =  new web3.eth.Contract(un2IRouter.abi as AbiItem[], DEXS[network].UniswapV2.Router);
export const suRouter = new web3.eth.Contract(un2IRouter.abi as AbiItem[], DEXS[network].Sushiswap.Router);
export const shRouter = new web3.eth.Contract(un2IRouter.abi as AbiItem[], DEXS[network].Shibaswap.Router);
export const dfRouter = new web3.eth.Contract(un2IRouter.abi as AbiItem[], DEXS[network].DefiSwap.Router);
export const luRouter = new web3.eth.Contract(un2IRouter.abi as AbiItem[], DEXS[network].LuaSwap.Router);
export const lkRouter = new web3.eth.Contract(lkIRouter.abi as AbiItem[], DEXS[network].LinkSwap.Router);
export const fxRouter = new web3.eth.Contract(fxIRouter.abi as AbiItem[], DEXS[network].FraxSwap.Router);
export const mnFactory = new web3.eth.Contract(mnIFactory.abi as AbiItem[], DEXS[network].MooniSwap.Factory);
export const bcQuoter = new web3.eth.Contract(bcIQuoter.abi as AbiItem[], DEXS[network].BancorV3.Quoter);
export const bcRouter = new web3.eth.Contract(bcIRouter.abi as AbiItem[], DEXS[network].BancorV3.Router);
export const smRouter = new web3.eth.Contract(smIRouter.abi as AbiItem[], DEXS[network].SmoothySwap.Router);
export const ddV1Helper = new web3.eth.Contract(ddIHelper.abi as AbiItem[], DEXS[network].DodoV1.Helper);
export const ddV2Proxy = new web3.eth.Contract(ddV2IProxy.abi as AbiItem[], DEXS[network].DodoV2.Proxy);
export const ddV2DVM = new web3.eth.Contract(ddV2IDVM.abi as AbiItem[], DEXS[network].DodoV2.DVM);
export const ddV2DPP = new web3.eth.Contract(ddV2IDPP.abi as AbiItem[], DEXS[network].DodoV2.DPP);
export const ddV2DSP = new web3.eth.Contract(ddV2IDSP.abi as AbiItem[], DEXS[network].DodoV2.DSP);
export const ddV2DCP = new web3.eth.Contract(ddV2IDCP.abi as AbiItem[], DEXS[network].DodoV2.DCP);
export const blV1Proxy = new web3.eth.Contract(blV1IProxy.abi as AbiItem[], DEXS[network].BalancerV1.Proxy);
export const getMooniPool = async (tokenIn: Token, tokenOut: Token) => {
    let mooniPool = await mnFactory.methods.pools(tokenIn.address, tokenOut.address).call();
    return new web3.eth.Contract(mnIRouter.abi as AbiItem[], mooniPool);
}
export const getERC20Contract = (token: Token) => {
    return new web3.eth.Contract(IERC20.abi as AbiItem[], token.address);
}
export const getChainlinkContract = (token: Token) => Chainlink[token.symbol] ?
    new web3.eth.Contract(IChainLink as AbiItem[], Chainlink[token.symbol]) : null;
    
// export const getUniV1Exchange = async (token: Token) => {
//     const exchangeAddr = await uni1Factory.methods.getExchange(token.address).call();
//     return new web3.eth.Contract(un1IExchange.abi as AbiItem[], exchangeAddr);
// }
export const getDODOV1Pool = (tokenIn: Token, tokenOut: Token) => {
    let dodoV1Pool = ZERO_ADDRESS;
    const pair = [tokenIn.symbol, tokenOut.symbol].sort();
    for (const pool of DODOV1POOLS) {
        if (pool.pair.sort().join() === pair.join()) {
            dodoV1Pool = pool.address[0];
        }
    }
    return new web3.eth.Contract(ddV1Pool.abi as AbiItem[], dodoV1Pool);
};
export const getDODOV2Pool = async (tokenIn: Token, tokenOut: Token) => {
    // const pair = [tokenIn.address, tokenOut.address].sort();
  
    // for (const pool of DODOV2POOLS) {
    //     if (pool.address.join() === pair.join()) {
    //         return new web3.eth.Contract(ddV2Pool.abi as AbiItem[], pool.address[0]);
    //     }
    // }
    // throw new Error(`Could not find pool for ${pair.join()}`);
    const pools: string[] = [];
    const dvmPools = await ddV2DVM.methods.getDODOPool(tokenIn.address, tokenOut.address).call();
    pools.push(...dvmPools);
    const dspPools = await ddV2DSP.methods.getDODOPool(tokenIn.address, tokenOut.address).call();
    pools.push(...dspPools);
    const dppPools = await ddV2DPP.methods.getDODOPool(tokenIn.address, tokenOut.address).call();
    pools.push(...dppPools);
    const dcpPools = await ddV2DCP.methods.getCrowdPooling(tokenIn.address, tokenOut.address).call();
    pools.push(...dcpPools);
    return pools;
};