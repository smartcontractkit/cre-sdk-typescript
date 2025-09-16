export type ChainFamily = "evm" | "solana" | "aptos" | "sui" | "ton" | "tron";

export interface ChainSelector {
  name: string;
  selector: string;
}

export interface NetworkInfo {
  chainId: string;
  chainSelector: ChainSelector;
  chainFamily: ChainFamily;
}
