import {
	mainnetByName,
	mainnetByNameByFamily,
	mainnetBySelector,
	mainnetBySelectorByFamily,
	testnetByName,
	testnetByNameByFamily,
	testnetBySelector,
	testnetBySelectorByFamily,
} from '@cre/generated/networks'
import { type GetNetworkOptions, NetworkLookup } from './network-lookup'
import type { NetworkInfo } from './types'

const defaultLookup = new NetworkLookup({
	mainnetByName,
	mainnetByNameByFamily,
	mainnetBySelector,
	mainnetBySelectorByFamily,
	testnetByName,
	testnetByNameByFamily,
	testnetBySelector,
	testnetBySelectorByFamily,
})

/**
 * High-performance network lookup using Maps for O(1) performance
 * @param options - Search criteria
 * @returns NetworkInfo if found, undefined otherwise
 */
export const getNetwork = (options: GetNetworkOptions): NetworkInfo | undefined =>
	defaultLookup.find(options)
