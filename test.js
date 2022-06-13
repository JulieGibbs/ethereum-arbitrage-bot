require('dotenv').config();
const Web3 = require('web3');
const IQuoter = require('@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json');
const IRouter = require('@uniswap/v3-periphery/artifacts/contracts/interfaces/ISwapRouter.sol/ISwapRouter.json');
const tokenAddress = require('./config/token.json');

const web3 = new Web3(`https://mainnet.infura.io/v3/${process.env.INFURA_KEY}`);

const quoter = new web3.eth.Contract(IQuoter.abi, '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6');
// const router = new web3.eth.Contract(IRouter.abi, '0xE592427A0AEce92De3Edee1F18E0157C05861564');

const main = async () => {
    const res = await quoter.methods.quoteExactInputSingle(
        tokenAddress.Mainnet.WETH,
        tokenAddress.Mainnet.DAI,
        3000,
        Web3.utils.toWei('1'),
        '0'
    ).call();
    console.log(Web3.utils.fromWei(res));
}

main();