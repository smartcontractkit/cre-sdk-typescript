import { describe, expect, it } from 'bun:test'
import { allNetworks, testnetByName, testnetBySelector } from '@cre/generated/networks'

// These values should come from the official Chain Selectors repo
// https://github.com/smartcontractkit/chain-selectors
// 16015286601757825753 - ethereum testnet sepolia selector
// ethereum-testnet-sepolia - ethereum testnet sepolia selector name

describe('generated chain selectors - testnets', () => {
	it('includes sepolia by bigint selector in testnet map', () => {
		const selector = 16015286601757825753n
		const network = testnetBySelector.get(selector)
		expect(network?.chainSelector.selector).toBe(selector)
		expect(network?.chainSelector.name).toBe('ethereum-testnet-sepolia')
	})

	it('includes sepolia by name in testnet map', () => {
		const name = 'ethereum-testnet-sepolia'
		const network = testnetByName.get(name)
		expect(network?.chainSelector.name).toBe(name)
		expect(network?.chainSelector.selector).toBe(16015286601757825753n)
	})

	it('allNetworks contains the sepolia network with bigint selector', () => {
		const found = allNetworks.find((n) => n.chainSelector.name === 'ethereum-testnet-sepolia')
		expect(found?.chainSelector.selector).toBe(16015286601757825753n)
		expect(found?.networkType).toBe('testnet')
	})
})
