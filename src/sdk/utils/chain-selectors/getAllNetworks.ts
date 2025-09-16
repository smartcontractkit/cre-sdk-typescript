import type { NetworkInfo } from "./types";
import { allNetworks } from "@cre/generated/networks";

export const getAllNetworks = (): NetworkInfo[] => allNetworks;
