import type { NetworkInfo } from "./types";
import { ALL_NETWORKS } from "@cre/generated/networks";

export const getAllNetworks = (): NetworkInfo[] => ALL_NETWORKS;
