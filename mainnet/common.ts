import BN from 'bignumber.js';
import { Table } from 'console-table-printer';
import { Contract } from 'web3-eth-contract';
import { Token } from '../lib/types';
import { account, fixed, web3 } from '../lib/config';
import { flashSwap, getERC20Contract } from '../lib/contracts';
import { getMaxFlashAmount } from '../lib/uniswap/v3/getCalldata';
import { toPrintable } from '../lib/utils';
import TOKEN from '../config/mainnet.json';

export const printAccountBalance = async (tokens: Token[]) => {
    const table = new Table();
    const tokenContracts: Contract[] = [];
    const row = { 'Token': 'Balance' };
    tokens.forEach((_token) => {
        tokenContracts.push(getERC20Contract(_token.address));
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
    const maxInputAmount = await getMaxFlashAmount(tokenContracts[0]);
    if (maxInputAmount !== undefined)
        console.log(`Max flash loan amount of ${tokens[0].symbol} is ${toPrintable(maxInputAmount, tokens[0].decimals, fixed)}`)
    console.log('-------------------------------------------------------------------------------------------------------------------');
    return maxInputAmount;
}
/**
* Swap tokens on contract.
* @param loanToken Address of token to loan.
* @param loanAmount Loan amount of token.
* @param tradePath Array of address to trade.
* @param dexPath Array of dex index.
*/
export const callFlashSwap = async (loanToken: string, loanAmount: BN, tokenPath: string[], spenders: string[], routers: string[], tradeDatas: string[]) => {
   console.log('Swapping ...');
   if (tokenPath.length != routers.length || tokenPath.length != tradeDatas.length) {
       console.log('Swap data is not correct!')
       return {};
   }
   const loanTokens = loanToken === TOKEN.WETH.address ? [TOKEN.DAI.address, loanToken] : [loanToken, TOKEN.WETH.address];
   const loanAmounts = loanToken === TOKEN.WETH.address ? ['0', loanAmount.toFixed()] : [loanAmount.toFixed(), '0']
   const init = flashSwap.methods.initUniFlashSwap(
       loanTokens,
       loanAmounts,
       tokenPath,
       spenders,
       routers,
       tradeDatas
   );
   const nonce = await web3.eth.getTransactionCount(account.address);
   const tx = {
       from: account.address,
       to: flashSwap.options.address,
       nonce: nonce,
       gas: 2000000,
       data: init.encodeABI()
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
