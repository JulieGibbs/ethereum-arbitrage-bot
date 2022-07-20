import * as dotenv from 'dotenv';
dotenv.config({ path: __dirname + '/../.env' });
export const RPC_URL = {
    "localhost": {
        "id": 1,
        "url": "http://127.0.0.1:8545"
    },
    "mainnet": {
        "id": 1,
        "url": "https://mainnet.infura.io/v3/" + process.env.INFURA_KEY
    },
    "kovan": {
        "id": 42,
        "url": "https://kovan.infura.io/v3/" + process.env.INFURA_KEY
    },
    "bsc": {
        "id": 56,
        "url": "https://bsc-dataseed1.binance.org/"
    },
    "polygon": {
        "id": 137,
        "url": "https://polygon-rpc.com/"
    },
    "avalanche": {
        "id": 43114,
        "url": ""
    },
    "optimism": {
        "id": 10,
        "url": ""
    }
}