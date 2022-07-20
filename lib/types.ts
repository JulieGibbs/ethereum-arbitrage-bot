export type Token = {
    address: string
    name: string
    symbol: string
    decimals: number
}
export enum ENV {Public, Local}

export type CallData = [string, string]
export type Tokens = {
    [key: string]: Token
}

export type Network = 'mainnet' | 'kovan' | 'arbitrum' | 'polygon' | 'bsc' | 'avalanche' | 'fantom' | 'optimism';

export type FileContent = {
    path: string[]
    profit: string
}[]

export type Multicall = {
    success: boolean
    returnData: string
}[]