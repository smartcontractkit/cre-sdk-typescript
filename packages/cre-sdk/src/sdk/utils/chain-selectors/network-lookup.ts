import type { ChainFamily, NetworkInfo } from './types'

export interface GetNetworkOptions {
	chainSelector?: bigint
	chainSelectorName?: string
	isTestnet?: boolean | undefined
	chainFamily?: ChainFamily
}

export type NetworkMapBySelector = Map<bigint, NetworkInfo>
export type NetworkMapByName = Map<string, NetworkInfo>
export type NetworkFamilyMapBySelector = Record<ChainFamily, NetworkMapBySelector>
export type NetworkFamilyMapByName = Record<ChainFamily, NetworkMapByName>

export interface NetworkMaps {
	mainnetByName: NetworkMapByName
	mainnetByNameByFamily: NetworkFamilyMapByName
	mainnetBySelector: NetworkMapBySelector
	mainnetBySelectorByFamily: NetworkFamilyMapBySelector
	testnetByName: NetworkMapByName
	testnetByNameByFamily: NetworkFamilyMapByName
	testnetBySelector: NetworkMapBySelector
	testnetBySelectorByFamily: NetworkFamilyMapBySelector
}

export class NetworkLookup {
	constructor(private maps: NetworkMaps) {}

	/**
	 * High-performance network lookup using Maps for O(1) performance
	 * @param options - Search criteria
	 * @returns NetworkInfo if found, undefined otherwise
	 */
	find(options: GetNetworkOptions): NetworkInfo | undefined {
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
				return getBySelector(this.maps.mainnetBySelectorByFamily[chainFamily])
			}

			if (isTestnet === true) {
				return getBySelector(this.maps.testnetBySelectorByFamily[chainFamily])
			}

			// If user haven't defined if it's testnet or not we can try all networks, starting from testnet
			let network = getBySelector(this.maps.testnetBySelectorByFamily[chainFamily])
			if (!network) {
				network = getBySelector(this.maps.mainnetBySelectorByFamily[chainFamily])
			}
			return network
		}

		if (chainFamily && chainSelectorName) {
			if (isTestnet === false) {
				return this.maps.mainnetByNameByFamily[chainFamily].get(chainSelectorName)
			}

			if (isTestnet === true) {
				return this.maps.testnetByNameByFamily[chainFamily].get(chainSelectorName)
			}

			// If user haven't defined if it's testnet or not we can try all networks, starting from testnet
			let network = this.maps.testnetByNameByFamily[chainFamily].get(chainSelectorName)
			if (!network) {
				network = this.maps.mainnetByNameByFamily[chainFamily].get(chainSelectorName)
			}
			return network
		}

		// If only network type is specified, use the general maps
		if (chainSelector !== undefined) {
			if (isTestnet === false) {
				return getBySelector(this.maps.mainnetBySelector)
			}

			if (isTestnet === true) {
				return getBySelector(this.maps.testnetBySelector)
			}

			// If user haven't defined if it's testnet or not we can try all networks, starting from testnet
			let network = getBySelector(this.maps.testnetBySelector)
			if (!network) {
				network = getBySelector(this.maps.mainnetBySelector)
			}
			return network
		}

		if (chainSelectorName) {
			if (isTestnet === false) {
				return this.maps.mainnetByName.get(chainSelectorName)
			}

			if (isTestnet === true) {
				return this.maps.testnetByName.get(chainSelectorName)
			}

			// If user haven't defined if it's testnet or not we can try all networks, starting from testnet
			let network = this.maps.testnetByName.get(chainSelectorName)
			if (!network) {
				network = this.maps.mainnetByName.get(chainSelectorName)
			}
			return network
		}

		return undefined
	}
}
