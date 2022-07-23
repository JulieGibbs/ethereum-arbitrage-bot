import BN from 'bignumber.js';
import { Table } from 'console-table-printer';
import { Contract } from 'web3-eth-contract';
import { CallData, Token } from '../lib/types';
import { account, fixed, web3 } from '../lib/config';
import { getERC20Contract } from '../lib/contracts';
import { getMaxFlashAmount3, getMaxFlashAmount2 } from '../lib/uniswap/v3/getCalldata';
import { toPrintable } from '../lib/utils';
import TOKEN from '../config/mainnet.json';
export const maxInt= new BN(2).pow(256).minus(1);

export const printAccountBalance = async (tokens: Token[]) => {
    const table = new Table();
    const tokenContracts: Contract[] = [];
    const row = { 'Token': 'Balance' };
    tokens.forEach((_token) => {
        tokenContracts.push(getERC20Contract(_token));
    });
    let ethBalance = await web3.eth.getBalance(account.address);
    row['ETH'] = toPrintable(new BN(ethBalance), 18, fixed);

    let promises = tokens.map((t, i) => tokenContracts[i].methods.balanceOf(account.address).call());
    let balances: string[] = await Promise.all(promises);
    balances.forEach((bal, i) => {
        row[tokens[i].symbol] = toPrintable(new BN(bal), tokens[i].decimals, fixed);
    });

    table.addRow(row);
    table.printTable();
    const maxAmount = await getMaxFlashAmount3(tokenContracts[0]);
    let maxFlashBalance: string
    if (maxAmount !== undefined) {
        maxFlashBalance = toPrintable(maxAmount, tokens[0].decimals, fixed);
        console.log(`Max flash loan amount of ${tokens[0].symbol} is ${maxFlashBalance}`)
    }
    console.log('-------------------------------------------------------------------------------------------------------------------');
    return maxFlashBalance;
}
/**
* Swap tokens on contract.
* @param loanToken Address of token to loan.
* @param loanAmount Loan amount of token.
* @param tradePath Array of address to trade.
* @param dexPath Array of dex index.
*/
export const callFlashSwap = async (loanToken: string, loanAmount: BN, tradeDatas: CallData[], flashSwap: Contract) => {
   console.log(`Swapping On ${flashSwap.options.address} ...`);
   const data = flashSwap.methods.initFlashloan(
       loanToken,
       loanAmount,
       tradeDatas
   );
   const nonce = await web3.eth.getTransactionCount(account.address);
   const tx = {
       from: account.address,
       to: flashSwap.options.address,
       nonce: nonce,
    //    gasPrice: 20000000000,
       gas: 1500000,
       data: data.encodeABI()
   };
   const signedTx = await account.signTransaction(tx);

   try {
       const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction!);
       console.log(`Transaction hash: https://etherscan.io/tx/${receipt.transactionHash}`);
   }
   catch (err) {
       console.log(err);
   }
}
export const getFlashSwapGas = async (loanToken: string, loanAmount: BN, tradeDatas: CallData[], flashSwap: Contract) => {
    const data = flashSwap.methods.initFlashloan(
        loanToken,
        loanAmount,
        tradeDatas
    );
    const gasPrice = 20000000000;
    const nonce = await web3.eth.getTransactionCount(account.address);
    const tx = {
        from: account.address,
        to: flashSwap.options.address,
        nonce: nonce,
        gasPrice: gasPrice,
        gas: 2000000,
        data: data.encodeABI()
    };
    const signedTx = await account.signTransaction(tx);
 
    try {
        const gas = await web3.eth.estimateGas({
            ...signedTx,
            from: process.env.WALLET_ADDRESS
        });
        const gasCost = new BN(gasPrice).times(new BN(gas)).div(new BN(10).pow(TOKEN.WETH.decimals));
        return gasCost.toFixed();
    }
    catch (err) {
        console.log(err);
    }
 }