import type { ChainFamily, NetworkInfo } from './types'
import {
	mainnetBySelector,
	testnetBySelector,
	mainnetByName,
	testnetByName,
	mainnetBySelectorByFamily,
	testnetBySelectorByFamily,
	mainnetByNameByFamily,
	testnetByNameByFamily,
} from '@cre/generated/networks'

interface GetNetworkOptions {
	chainSelector?: string
	chainSelectorName?: string
	isTestnet?: boolean
	chainFamily?: ChainFamily
}

/**
 * High-performance network lookup using Maps for O(1) performance
 * @param options - Search criteria
 * @returns NetworkInfo if found, undefined otherwise
 */
export const getNetwork = (options: GetNetworkOptions): NetworkInfo | undefined => {
	const { chainSelector, chainSelectorName, isTestnet = false, chainFamily } = options

	// Validate input - need either chainSelector or chainSelectorName
	if (!chainSelector && !chainSelectorName) {
		return undefined
	}

	// If both chainFamily and network type are specified, use the most specific maps
	if (chainFamily && chainSelector) {
		const familyMap = isTestnet
			? testnetBySelectorByFamily[chainFamily]
			: mainnetBySelectorByFamily[chainFamily]
		return familyMap?.get(chainSelector)
	}

	if (chainFamily && chainSelectorName) {
		const familyMap = isTestnet
			? testnetByNameByFamily[chainFamily]
			: mainnetByNameByFamily[chainFamily]
		return familyMap?.get(chainSelectorName)
	}

	// If only network type is specified, use the general maps
	if (chainSelector) {
		const selectorMap = isTestnet ? testnetBySelector : mainnetBySelector
		return selectorMap.get(chainSelector)
	}

	if (chainSelectorName) {
		const nameMap = isTestnet ? testnetByName : mainnetByName
		return nameMap.get(chainSelectorName)
	}

	return undefined
}
