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
```
node mainnet dai weth
```
- On testnet
```
node testnet dai weth
```


# Developer Instructions - Flashloan

## Adding a new token 
1. Go to /config and open token.json
2. Add the token symbol and its blockchain network token address accordingly 


## Adding a new DEX