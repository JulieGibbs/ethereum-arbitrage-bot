import TOKEN from '../../config/mainnet.json';
export const flashloanAddress = '0x33d8d437796bd43bdccc6740c585f4a15d1070b7';
export const dodoProxy = '0xa356867fDCEa8e71AEaF87805808803806231FdC';
export const dodoApprove = '0xCB859eA579b28e02B87A1FDE08d087ab9dbE5149';
export const DODOV1POOLS = [
  {
    pair: ["WETH", "USDC"],
    address: ["0x75c23271661d9d143dcb617222bc4bec783eff34"]
  },
  {
    pair: ["LINK", "USDC"],
    address: ["0x562c0b218cc9ba06d9eb42f3aef54c54cc5a4650"]
  },
  {
    pair: ["LEND", "USDC"],
    address: ["0xc226118fcd120634400ce228d61e1538fb21755f"]
  },
  {
    pair: ["AAVE", "USDC"],
    address: ["0x94512fd4fb4feb63a6c0f4bedecc4a00ee260528"]
  },
  {
    pair: ["SNX", "USDC"],
    address: ["0xca7b0632bd0e646b0f823927d3d2e61b00fe4d80"]
  },
  {
    pair: ["COMP", "USDC"],
    address: ["0x0d04146b2fe5d267629a7eb341fb4388dcdbd22f"]
  },
  {
    pair: ["WBTC", "USDC"],
    address: ["0x2109f78b46a789125598f5ad2b7f243751c2934d"]
  },
  {
    pair: ["YFI", "USDC"],
    address: ["0x1b7902a66f133d899130bf44d7d879da89913b2e"]
  },
  {
    pair: ["FIN", "USDT"],
    address: ["0x9d9793e1e18cdee6cf63818315d55244f73ec006"]
  },
  {
    pair: ["USDT", "USDC"],
    address: ["0xC9f93163c99695c6526b799EbcA2207Fdf7D61aD"]
  },
  {
    pair: ["WOO", "USDT"],
    address: ["0x181d93ea28023bf40c8bb94796c55138719803b4"]
  },
  {
    pair: ["WCRES", "USDT"],
    address: ["0x85f9569b69083c3e6aeffd301bb2c65606b5d575"]
  }
]
export const DODOV2POOLS = [
    {
      pair: ["DAI", "USDC"],
      address: [
        "0xaaE10Fa31E73287687ce56eC90f81A800361B898",
        "0x356cB8AE24B6814bD8aA1A281B14532C52A4E404",
      ],
    },
    {
      pair: ["DAI", "USDT"],
      address: [
        "0xA0020444b98f67B77a3d6dE6E66aF11c87da086e",
        "0x38C56f05a7b4E4dC79Eac6C264829C7b21fBf7A8",
      ],
    },
    {
      pair: ["USDC", "WETH"],
      address: ["0x5333Eb1E32522F1893B7C9feA3c263807A02d561"],
    },
    {
      pair: ["USDC", "WMATIC"],
      address: ["0x10Dd6d8A29D489BEDE472CC1b22dc695c144c5c7"],
    },
    {
      pair: ["USDC", "USDT"],
      address: ["0xA0020444b98f67B77a3d6dE6E66aF11c87da086e"],
    },
];