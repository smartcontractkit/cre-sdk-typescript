export type ChainFamily = 'evm' | 'solana' | 'aptos' | 'sui' | 'ton' | 'tron'
export type NetworkType = 'mainnet' | 'testnet'

export interface ChainSelector {
	name: string
	selector: bigint
}

export interface NetworkInfo {
	chainId: string
	chainSelector: ChainSelector
	chainFamily: ChainFamily
	networkType: NetworkType
}
