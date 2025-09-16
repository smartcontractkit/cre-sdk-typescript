import type { NetworkInfo } from "./types";
import { getAllNetworks } from "./getAllNetworks";

export const getNetworkByChainSelectorName = (
  name: string
): NetworkInfo | undefined => {
  return getAllNetworks().find((n) => n.chainSelector.name === name);
};
