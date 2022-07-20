import axios from 'axios';
import BN from 'bignumber.js';
import { Contract } from 'web3-eth-contract';
import { Network, Token } from './types';
import { flashSwap, getChainlinkContract, getERC20Contract } from './contracts';
import { RPC_URL } from './rpcURLs'; 

export const getPriceOnOracle = async (token: Token) => {
    const contract = getChainlinkContract(token);
    if (!contract) return new BN(-Infinity);
    const res = await contract.methods.latestAnswer().call();
    return new BN(res);
}
export const getAllowance = async (token: Token, owner: string, spender: string) => {
    const erc20 = getERC20Contract(token);
    return await erc20.methods.allowance(owner, spender).call();
}
export const getApproveEncode = (token: Token, spender: string, amount: BN) => {
    const erc20 = getERC20Contract(token);
    return erc20.methods.approve(spender, amount.toFixed()).encodeABI();
}
export const getDodoVMQuote = async (amountIn: BN, tokenIn: string, tokenOut: string, quoter: Contract, account: string) => {
    try {
        let [amountOut,] = await quoter.methods.querySellBase(account, amountIn).call();
        console.log(amountOut);

        return new BN(amountOut);
    }
    catch (err) {
        return new BN(-Infinity);
    }
}

/**
 * Get Kyber quote.
 * @param amountIn Input amount of token.
 * @param tokenIn Input token address.
 * @param tokenOut Output token address.
 * @param quoter Quoter contract.
 * @returns Output amount of token.
 */
export const getKyberQuote = async (amountIn: BN, tokenIn: string, tokenOut: string, quoter: Contract) => {
    try {
        const quoteOut = await quoter.methods.quoteExactInputSingle(
            {
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                feeUnits: 3000,
                amountIn: amountIn.toFixed(),
                limitSqrtP: '0'
            }
        ).call();
        return new BN(quoteOut.returnedAmount);
    }
    catch (err) {
        return new BN(-Infinity);
    }
}

/**
 * Get Balancer quote.
 * @param amountIn Input amount of token.
 * @param tokenIn Input token address.
 * @param tokenOut Output token address.
 * @param quoter Quoter contract.
 * @returns Output amount of token.
 */
export const getBalancerQuote = async (amountIn: BN, tokenIn: string, tokenOut: string, quoter: Contract) => {
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
        const quoteOut = await quoter.methods.queryBatchSwap(
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
export const getSwapFromDodoApi = async (amountIn: BN, tokenIn: Token, tokenOut: Token, network: Network) => {
    try {
        const res = await axios.get(`https://route-api.dodoex.io/dodoapi/getdodoroute`, {
            params: {
                fromTokenAddress: tokenIn.address,
                fromTokenDecimals: tokenIn.decimals,
                toTokenAddress: tokenOut.address,
                toTokenDecimals: tokenOut.decimals,
                fromAmount: amountIn.toFixed(),
                slippage: 1,
                userAddr: flashSwap.options.address,
                chainId: RPC_URL[network].id,
                rpc: RPC_URL[network].url
            }
        });
        return res.data;
    }
    catch (err) {
        return null;
    }
}
export const getSwapFromZeroXApi = async (amountIn: BN, tokenIn: Token, tokenOut: Token, network: Network) => {
    let chain = '';
    if (network === 'polygon') chain = 'polygon.';
    if (network === 'bsc') chain = 'bsc.';
    if (network === 'optimism') chain = 'optimism.';
    try {
        const res = await axios.get(`https://${chain}api.0x.org/swap/v1/quote`, {
            params: {
                sellToken: tokenIn.address,
                buyToken: tokenOut.address,
                sellAmount: amountIn.toFixed()
            }
        });
        return res.data;
    }
    catch (err) {
        return null;
    }
}
/**
 * Get dex path and quote.
 * @param amountIn Input amount of token.
 * @param tokenIn Input token address.
 * @param tokenOut Output token address.
 * @param network Network name.
 * @returns Best dex path and quote.
 */
export const getPriceFrom1InchApi = async (amountIn: BN, tokenIn: Token, tokenOut: Token, network: Network) => {
    
    try {
        const res = await axios.get(`https://api.1inch.exchange/v4.0/${RPC_URL[network].id}/quote`, {
            params: {
                fromTokenAddress: tokenIn.address,
                toTokenAddress: tokenOut.address,
                amount: amountIn.toFixed()
            }
        });
        return res.data;
    }
    catch (err) {
        return null;
    }
}

/**
 * Get dex path and quote.
 * @param amountIn Input amount of token.
 * @param tokenIn Input token address.
 * @param tokenOut Output token address.
 * @param network Network name.
 * @param flashswap FlashSwap address.
 * @returns Best dex path and quote.
 */
export const getSwapFrom1InchApi = async (amountIn: BN, tokenIn: Token, tokenOut: Token, network: Network, flashswap: string) => {
    
    try {
        const res = await axios.get(`https://api.1inch.exchange/v4.0/${RPC_URL[network].id}/swap`, {
            params: {
                fromTokenAddress: tokenIn.address,
                toTokenAddress: tokenOut.address,
                amount: amountIn.toFixed(),
                fromAddress: flashswap,
                slippage: 1,
                disableEstimate: true
            }
        });
        return res.data;
    }
    catch (err) {
        return null;
    }
}

/**
 * Stringify big number.
 * @param amount Wei amount.
 * @param decimal Decimal of token.
 * @param fixed Fixed number.
 * @returns Stringified number.
 */
export const toPrintable = (amount: BN, decimal: number, fixed: number) => {
    return amount.isFinite()
        ? amount.div(new BN(10).pow(decimal)).toFixed(fixed)
        : 'N/A';
}

export const stripAnsiCodes = (str: string) => str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
