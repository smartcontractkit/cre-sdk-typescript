import type { ChainFamily, NetworkInfo } from "./types";
import { getAllNetworks } from "./getAllNetworks";

export const getNetworkByFamilyAndChainId = (
  family: ChainFamily,
  chainId: string
): NetworkInfo | undefined => {
  return getAllNetworks().find(
    (n) => n.chainFamily === family && n.chainId === chainId
  );
};
