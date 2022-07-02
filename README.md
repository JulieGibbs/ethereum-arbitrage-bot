# Flashloan Arbitrage Bot
Flashloan Bot Arbitrage Finder

## Usage

1. Rename `.env.example` file to `.env` inside the bot directory
 
2. Config `.env` file. 

    Here, you need three things. 
    * Insert your INFURA Project ID. You can create a infura Project ID [here](https://infura.io). 
    * Insert your MetaMask (Kovan Testnet) 32byte wallet private key.


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
    * trader bot for 1inch V4 Router
        ```
        yarn main-trader-1inch dai weth
        ```
    * finder2pair bot
        ```
        yarn main-finder2
        ```
    * finder3pair bot
        ```
        yarn main-finder3
        ```
    * finder2pair_api bot
        ```
        yarn main-finder2-api
        ```
    * finder3pair_api bot
        ```
        yarn main-finder3-api
        ```
- On testnet
    * trader bot
        ```
        yarn test-trader dai weth
        ```
    * new trader bot
        ```
        yarn test-trader-new dai weth
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