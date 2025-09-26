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
import type { ChainFamily, NetworkInfo } from './types'

interface GetNetworkOptions {
	chainSelector?: bigint
	chainSelectorName?: string
	isTestnet?: boolean | undefined
	chainFamily?: ChainFamily
}

/**
 * High-performance network lookup using Maps for O(1) performance
 * @param options - Search criteria
 * @returns NetworkInfo if found, undefined otherwise
 */
export const getNetwork = (options: GetNetworkOptions): NetworkInfo | undefined => {
	const { chainSelector, chainSelectorName, isTestnet, chainFamily } = options

	const getBySelector = (map: Map<bigint, NetworkInfo>) => {
		if (chainSelector === undefined) return undefined
		return map.get(chainSelector)
	}

	// Validate input - need either chainSelector or chainSelectorName
	if (!chainSelector && !chainSelectorName) {
		return undefined
	}

	// If both chainFamily and network type are specified, use the most specific maps
	if (chainFamily && chainSelector !== undefined) {
		if (isTestnet === false) {
			return getBySelector(mainnetBySelectorByFamily[chainFamily])
		}

		if (isTestnet === true) {
			return getBySelector(testnetBySelectorByFamily[chainFamily])
		}

		// If user haven't defined if it's testnet or not we can try all networks, starting from testnet
		let network = getBySelector(testnetBySelectorByFamily[chainFamily])
		if (!network) {
			network = getBySelector(mainnetBySelectorByFamily[chainFamily])
		}
		return network
	}

	if (chainFamily && chainSelectorName) {
		if (isTestnet === false) {
			return mainnetByNameByFamily[chainFamily].get(chainSelectorName)
		}

		if (isTestnet === true) {
			return testnetByNameByFamily[chainFamily].get(chainSelectorName)
		}

		// If user haven't defined if it's testnet or not we can try all networks, starting from testnet
		let network = testnetByNameByFamily[chainFamily].get(chainSelectorName)
		if (!network) {
			network = mainnetByNameByFamily[chainFamily].get(chainSelectorName)
		}
		return network
	}

	// If only network type is specified, use the general maps
	if (chainSelector !== undefined) {
		if (isTestnet === false) {
			return getBySelector(mainnetBySelector)
		}

		if (isTestnet === true) {
			return getBySelector(testnetBySelector)
		}

		// If user haven't defined if it's testnet or not we can try all networks, starting from testnet
		let network = getBySelector(testnetBySelector)
		if (!network) {
			network = getBySelector(mainnetBySelector)
		}
		return network
	}

	if (chainSelectorName) {
		if (isTestnet === false) {
			return mainnetByName.get(chainSelectorName)
		}

		if (isTestnet === true) {
			return testnetByName.get(chainSelectorName)
		}

		// If user haven't defined if it's testnet or not we can try all networks, starting from testnet
		let network = testnetByName.get(chainSelectorName)
		if (!network) {
			network = mainnetByName.get(chainSelectorName)
		}
		return network
	}

	return undefined
}
