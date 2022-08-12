# Flashloan Arbitrage Bot
Flashloan Bot Arbitrage Finder

## Usage

1. Rename `.env.example` file to `.env` inside the bot directory
 
2. Config `.env` file. 

    Here, you need four things. 
    * Insert your INFURA Project ID. You can create a infura Project ID [here](https://infura.io). 
    * Insert your MetaMask (Kovan Testnet) 32byte wallet private key.
    * Insert your cotract address(mainnet or kovan)
    * Insert UniswapV3 Factory address. 

3. Install node modules. Open terminal window and run:

    ```
    npm install
    ```

4. Run bot

- Trade for origin 
    * trader bot
        ```
        yarn main-trader dai weth
        ```
    * finder bot
        ```
        yarn main-finder * weth
        yarn main-finder weth usdt *
        yarn main-finder weth * *
        yarn main-finder * weth *
        ```
- Trade for 0x Exchage API
    * trader bot bot
        ```
        yarn zero-trader dai weth
        ```
    * finder bot
        ```
        yarn zero-finder * weth
        yarn zero-finder weth usdt *
        yarn zero-finder weth * *
        yarn zero-finder * weth *
        ```
- Trade for 1Inch Exchage API
    * trader bot bot
        ```
        yarn one-trader dai weth
        ```
    * finder bot
        ```
        yarn one-finder * weth
        yarn one-finder weth usdt *
        yarn one-finder weth * *
        yarn one-finder * weth *
        ```
- Trade for Dodo Exchage API
    * trader bot bot
        ```
        yarn dodo-trader dai weth
        ```
    * finder bot
        ```
        yarn dodo-finder * weth
        yarn dodo-finder weth usdt *
        yarn dodo-finder weth * *
        yarn dodo-finder * weth *
        ```


# Developer Instructions - Flashloan

## Adding a new token 
1. Go to /config and open token.json
2. Add the token symbol and its blockchain network token address accordingly 


## Adding a new DEX



# Short List scan of top Volume tokens only

- Doing a "short scan" of the "short" lists

```
ts-node finder2pairshort
```

- Added 19th June, 22:20.



# Add new DEX's

1. (/config/dexs.json)
Add the DEX name, together with it's Proxy/Router/Quoter/Factory contract address(es) found in the DEX documentation to the /config/dexs.json file.

2. (/abi/NEWDEXNAME.json)
Get the ABI code from the individual DEXs GitHub repo or contract address on etherscan.io.
And add it to a /abi/DEXNAME.json file. Depending on the DEX it will be the Router/Factory/Exchange/Quoter json files.

3. (/lib/contracts.ts)
Create contract instance(constant) with address and ABI for specific DEX in lib/contracts.ts file.
If contract address is depended on token pair like Mooniswap, create function to get contract instance for specific token pair.


4. (/lib/NEWDEXNAME)
Add the "getCalldata.ts" file under /lib/DEXNAME folder you create if needed.
Add functions(get calldatas for price and swap) in getCalldata.ts file.

5. (/lib/contracts.ts):
export a new, shorter name as a constant of the DEX in /lib/contracts, by making the constant a combination of the Router/Quoter/Factory/AbiItem, and anything else that is required.

6. (mainnet/origin/common.ts):
add the new short name of the router/quoter/dex info in the "import { " section.

Import the "getPriceOnDEXNAME" in the same file as step 6 (around line 25)

As well as adding a new constant export of the DEXs name array to display on screen(around line 35).

Also make sure to add the new DEX with a 2-3 char name as a constant in the "getAllQuotes" section (around line 60).

Modify and add the relevant information/constants in the "const result: Multicall" section.
"getAllQuotes" function returns array of quotes and contract instances(router).  

7. (mainnet/origin/trader):

import "getSwapOnDEXNAME" function for the new dex in the "header".

add the dex to the "const runBot" section as an 'else if' statement by adding it below the rest as a new ID (in order).
