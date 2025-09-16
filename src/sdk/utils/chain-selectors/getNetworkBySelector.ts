import type { NetworkInfo } from "./types";
import { getAllNetworks } from "./getAllNetworks";

export const getNetworkBySelector = (
  selector: string
): NetworkInfo | undefined => {
  return getAllNetworks().find((n) => n.chainSelector.selector === selector);
};
