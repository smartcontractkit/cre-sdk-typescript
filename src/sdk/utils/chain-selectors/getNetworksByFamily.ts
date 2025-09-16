import type { ChainFamily, NetworkInfo } from "./types";
import { getAllNetworks } from "./getAllNetworks";

export const getNetworksByFamily = (family: ChainFamily): NetworkInfo[] => {
  return getAllNetworks().filter((n) => n.chainFamily === family);
};
