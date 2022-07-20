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