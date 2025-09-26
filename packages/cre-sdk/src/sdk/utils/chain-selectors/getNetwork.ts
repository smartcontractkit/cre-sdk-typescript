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
	chainSelector?: string
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

	// Validate input - need either chainSelector or chainSelectorName
	if (!chainSelector && !chainSelectorName) {
		return undefined
	}

	// If both chainFamily and network type are specified, use the most specific maps
	if (chainFamily && chainSelector) {
		if (isTestnet === false) {
			return mainnetBySelectorByFamily[chainFamily].get(chainSelector)
		}

		if (isTestnet === true) {
			return testnetBySelectorByFamily[chainFamily].get(chainSelector)
		}

		// If user haven't defined if it's testnet or not we can try all networks, starting from testnet
		let network = testnetBySelectorByFamily[chainFamily].get(chainSelector)
		if (!network) {
			network = mainnetBySelectorByFamily[chainFamily].get(chainSelector)
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
	if (chainSelector) {
		if (isTestnet === false) {
			return mainnetBySelector.get(chainSelector)
		}

		if (isTestnet === true) {
			return testnetBySelector.get(chainSelector)
		}

		// If user haven't defined if it's testnet or not we can try all networks, starting from testnet
		let network = testnetBySelector.get(chainSelector)
		if (!network) {
			network = mainnetBySelector.get(chainSelector)
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
