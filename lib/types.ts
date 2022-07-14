export type Token = {
    address: string
    name: string
    symbol: string
    decimals: number
}

export type Tokens = {
    [key: string]: Token
}

export type Network = 'mainnet' | 'localhost' | 'arbitrum' | 'polygon' | 'bsc' | 'avalanche' | 'fantom' | 'optimism';

export type FileContent = {
    path: string[]
    profit: string
}[]

export type Multicall = {
    success: boolean
    returnData: string
}[]