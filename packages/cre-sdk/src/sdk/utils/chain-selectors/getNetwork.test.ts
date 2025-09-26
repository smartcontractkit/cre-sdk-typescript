import { describe, expect, it, mock } from 'bun:test'

// Mock the generated networks module with deterministic fixtures
const mockModulePath = '@cre/generated/networks'

const evmMain = {
	chainId: '1',
	chainSelector: { name: 'EVM_MAIN', selector: '100' },
	chainFamily: 'evm',
	networkType: 'mainnet',
} as const

const evmTest = {
	chainId: '5',
	chainSelector: { name: 'EVM_TEST', selector: '200' },
	chainFamily: 'evm',
	networkType: 'testnet',
} as const

const solMain = {
	chainId: 'sol-main',
	chainSelector: { name: 'SOL_MAIN', selector: '300' },
	chainFamily: 'solana',
	networkType: 'mainnet',
} as const

const solTest = {
	chainId: 'sol-test',
	chainSelector: { name: 'SOL_TEST', selector: '400' },
	chainFamily: 'solana',
	networkType: 'testnet',
} as const

// Create all maps required by getNetwork
const mainnetBySelector = new Map<string, any>([
	[evmMain.chainSelector.selector, evmMain],
	[solMain.chainSelector.selector, solMain],
])
const testnetBySelector = new Map<string, any>([
	[evmTest.chainSelector.selector, evmTest],
	[solTest.chainSelector.selector, solTest],
])
const mainnetByName = new Map<string, any>([
	[evmMain.chainSelector.name, evmMain],
	[solMain.chainSelector.name, solMain],
])
const testnetByName = new Map<string, any>([
	[evmTest.chainSelector.name, evmTest],
	[solTest.chainSelector.name, solTest],
])

const mainnetBySelectorByFamily = {
	evm: new Map<string, any>([[evmMain.chainSelector.selector, evmMain]]),
	solana: new Map<string, any>([[solMain.chainSelector.selector, solMain]]),
	aptos: new Map(),
	sui: new Map(),
	ton: new Map(),
	tron: new Map(),
} as const

const testnetBySelectorByFamily = {
	evm: new Map<string, any>([[evmTest.chainSelector.selector, evmTest]]),
	solana: new Map<string, any>([[solTest.chainSelector.selector, solTest]]),
	aptos: new Map(),
	sui: new Map(),
	ton: new Map(),
	tron: new Map(),
} as const

const mainnetByNameByFamily = {
	evm: new Map<string, any>([[evmMain.chainSelector.name, evmMain]]),
	solana: new Map<string, any>([[solMain.chainSelector.name, solMain]]),
	aptos: new Map(),
	sui: new Map(),
	ton: new Map(),
	tron: new Map(),
} as const

const testnetByNameByFamily = {
	evm: new Map<string, any>([[evmTest.chainSelector.name, evmTest]]),
	solana: new Map<string, any>([[solTest.chainSelector.name, solTest]]),
	aptos: new Map(),
	sui: new Map(),
	ton: new Map(),
	tron: new Map(),
} as const

// Install module mock before importing the SUT
mock.module(mockModulePath, () => ({
	mainnetByName,
	mainnetByNameByFamily,
	mainnetBySelector,
	mainnetBySelectorByFamily,
	testnetByName,
	testnetByNameByFamily,
	testnetBySelector,
	testnetBySelectorByFamily,
}))

const { getNetwork } = await import('./getNetwork')

describe('getNetwork', () => {
	it('returns undefined when neither chainSelector nor chainSelectorName provided', () => {
		expect(getNetwork({})).toBeUndefined()
	})

	// chainFamily + chainSelector
	it('uses family+selector with isTestnet=true (testnet family map)', () => {
		const result = getNetwork({
			chainFamily: 'evm',
			chainSelector: '200',
			isTestnet: true,
		})
		expect(result).toEqual(evmTest)
	})

	it('uses family+selector with isTestnet=false (mainnet family map)', () => {
		const result = getNetwork({
			chainFamily: 'evm',
			chainSelector: '100',
			isTestnet: false,
		})
		expect(result).toEqual(evmMain)
	})

	it('uses family+selector with isTestnet undefined defaults to mainnet map', () => {
		const result = getNetwork({ chainFamily: 'solana', chainSelector: '300' })
		expect(result).toEqual(solMain)
	})

	it('uses family+selector with isTestnet undefined prefers testnet when present', () => {
		const result = getNetwork({ chainFamily: 'evm', chainSelector: '200' })
		expect(result).toEqual(evmTest)
	})

	it('family+selector returns undefined when selector not in that family', () => {
		const result = getNetwork({
			chainFamily: 'evm',
			chainSelector: '300',
			isTestnet: false,
		})
		expect(result).toBeUndefined()
	})

	// chainFamily + chainSelectorName
	it('uses family+name with isTestnet=true (testnet family map)', () => {
		const result = getNetwork({
			chainFamily: 'solana',
			chainSelectorName: 'SOL_TEST',
			isTestnet: true,
		})
		expect(result).toEqual(solTest)
	})

	it('uses family+name with isTestnet=false (mainnet family map)', () => {
		const result = getNetwork({
			chainFamily: 'solana',
			chainSelectorName: 'SOL_MAIN',
			isTestnet: false,
		})
		expect(result).toEqual(solMain)
	})

	it('uses family+name with isTestnet undefined defaults to mainnet map', () => {
		const result = getNetwork({
			chainFamily: 'evm',
			chainSelectorName: 'EVM_MAIN',
		})
		expect(result).toEqual(evmMain)
	})

	it('uses family+name with isTestnet undefined prefers testnet when present', () => {
		const result = getNetwork({
			chainFamily: 'evm',
			chainSelectorName: 'EVM_TEST',
		})
		expect(result).toEqual(evmTest)
	})

	it('family+name returns undefined when name not in that family', () => {
		const result = getNetwork({
			chainFamily: 'solana',
			chainSelectorName: 'EVM_MAIN',
			isTestnet: false,
		})
		expect(result).toBeUndefined()
	})

	// selector only
	it('selector only with isTestnet=false returns mainnet', () => {
		const result = getNetwork({ chainSelector: '100', isTestnet: false })
		expect(result).toEqual(evmMain)
	})

	it('selector only with isTestnet=true returns testnet', () => {
		const result = getNetwork({ chainSelector: '200', isTestnet: true })
		expect(result).toEqual(evmTest)
	})

	it('selector only with isTestnet undefined prefers testnet if exists', () => {
		// create duplicate selector present in both maps to assert preference
		const dupMain = {
			...evmMain,
			chainSelector: {
				...evmMain.chainSelector,
				selector: '900',
				name: 'DUP_MAIN',
			},
		}
		const dupTest = {
			...evmTest,
			chainSelector: {
				...evmTest.chainSelector,
				selector: '900',
				name: 'DUP_TEST',
			},
		}
		mainnetBySelector.set('900', dupMain)
		testnetBySelector.set('900', dupTest)

		const result = getNetwork({ chainSelector: '900' })
		expect(result).toEqual(dupTest)
	})

	it('selector only with isTestnet undefined falls back to mainnet if not in testnet', () => {
		const result = getNetwork({ chainSelector: '300' })
		expect(result).toEqual(solMain)
	})

	it('selector only returns undefined when not found anywhere', () => {
		const result = getNetwork({ chainSelector: '9999' })
		expect(result).toBeUndefined()
	})

	// both selector and name provided - selector takes precedence
	it('both selector and name provided without family uses selector path', () => {
		const result = getNetwork({
			chainSelector: '100',
			chainSelectorName: 'SOL_MAIN',
			isTestnet: false,
		})
		expect(result).toEqual(evmMain)
	})

	it('both selector and name provided with family uses selector path', () => {
		const result = getNetwork({
			chainFamily: 'solana',
			chainSelector: '300',
			chainSelectorName: 'EVM_MAIN',
		})
		expect(result).toEqual(solMain)
	})

	it('both selector and name provided prefers testnet by selector when isTestnet undefined', () => {
		// ensure duplicate in both maps like earlier
		const dupMain = {
			...evmMain,
			chainSelector: {
				...evmMain.chainSelector,
				selector: '901',
				name: 'DUP2_MAIN',
			},
		}
		const dupTest = {
			...evmTest,
			chainSelector: {
				...evmTest.chainSelector,
				selector: '901',
				name: 'DUP2_TEST',
			},
		}
		mainnetBySelector.set('901', dupMain)
		testnetBySelector.set('901', dupTest)

		const result = getNetwork({
			chainSelector: '901',
			chainSelectorName: 'DUP2_MAIN',
		})
		expect(result).toEqual(dupTest)
	})

	// name only
	it('name only with isTestnet=false returns mainnet', () => {
		const result = getNetwork({
			chainSelectorName: 'EVM_MAIN',
			isTestnet: false,
		})
		expect(result).toEqual(evmMain)
	})

	it('name only with isTestnet=true returns testnet', () => {
		const result = getNetwork({
			chainSelectorName: 'EVM_TEST',
			isTestnet: true,
		})
		expect(result).toEqual(evmTest)
	})

	it('name only with isTestnet undefined prefers testnet if exists', () => {
		// For names, ensure both entries exist for a shared name key
		mainnetByName.set('DUP', evmMain)
		testnetByName.set('DUP', evmTest)
		const result = getNetwork({ chainSelectorName: 'DUP' })
		expect(result).toEqual(evmTest)
	})

	it('name only with isTestnet undefined falls back to mainnet if not in testnet', () => {
		const result = getNetwork({ chainSelectorName: 'SOL_MAIN' })
		expect(result).toEqual(solMain)
	})

	it('returns undefined for non-existent chainSelectorName', () => {
		const result = getNetwork({ chainSelectorName: 'UNKNOWN_NAME' })
		expect(result).toBeUndefined()
	})

	it('returns undefined for unsupported family when maps are empty (selector)', () => {
		const result = getNetwork({
			chainFamily: 'aptos',
			chainSelector: '100',
			isTestnet: false,
		})
		expect(result).toBeUndefined()
	})

	it('returns undefined for unsupported family when maps are empty (name)', () => {
		const result = getNetwork({
			chainFamily: 'aptos',
			chainSelectorName: 'EVM_MAIN',
			isTestnet: false,
		})
		expect(result).toBeUndefined()
	})
})
