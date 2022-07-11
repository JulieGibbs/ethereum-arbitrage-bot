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

- On mainnet
    * trader bot
        ```
        yarn main-trader dai weth
        ```
    * trader bot for 0x Exchange
        ```
        yarn main-trader-zero dai weth
        ```
    * finder2pair bot
        ```
        yarn main-finder2
        ```
    * finder3pair bot
        ```
        yarn main-finder3
        ```
    * finder3pair_zero bot
        ```
        yarn main-finder3-zero
        ```
    * finder2pair_zero bot
        ```
        yarn main-finder3-zero
        ```
- On mainnet fork
    * trader bot
        ```
        yarn test-trader dai weth
        ```
    * trader bot for 0x Exchange
        ```
        yarn test-trader-zero dai weth
        ```
    * finder2pair bot
        ```
        yarn test-finder2
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