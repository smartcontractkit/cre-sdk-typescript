import type { ChainFamily, NetworkInfo } from "./types";
import { getAllNetworks } from "./getAllNetworks";

export const getNetworkByChainId = (
  chainId: string,
  family?: ChainFamily
): NetworkInfo | undefined => {
  const networks = getAllNetworks();

  if (family) {
    return networks.find(
      (n) => n.chainFamily === family && n.chainId === chainId
    );
  }

  return networks.find((n) => n.chainId === chainId);
};
