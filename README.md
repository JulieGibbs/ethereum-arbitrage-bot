# Flashloan Arbitrage Bot
Flashloan Bot Arbitrage Finder

## Requirement

You must install `ts-node` and `typescript` modules globally.

Install this modules.

```
npm install -g typescript ts-node
```

```
ts-node --version
v10.8.1

tsc --version
Version 4.7.4
```

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
    * finder2pair bot
        ```
        yarn main-finder2
        ```
    * trader bot
        ```
        yarn main-trader dai weth
        ```
- On testnet
    * finder2pair bot
        ```
        yarn test-finder2
        ```
    * trader bot
        ```
        yarn test-trader dai weth
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