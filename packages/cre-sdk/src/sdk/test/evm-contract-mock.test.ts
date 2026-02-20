import { describe, expect } from 'bun:test'
import type { GasConfigJson } from '@cre/generated/capabilities/blockchain/evm/v1alpha/client_pb'
import type { ReportResponseJson } from '@cre/generated/sdk/v1alpha/sdk_pb'
import { type Abi, type Address, encodeFunctionData } from 'viem'
import { newTestRuntime, test } from '../testutils/test-runtime'
import { addContractMock, type ContractMock } from './evm-contract-mock'
import { EvmMock } from './generated'

const MOCK_ADDRESS_A: Address = '0x1234567890123456789012345678901234567890'
const MOCK_ADDRESS_B: Address = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
const CHAIN_SELECTOR = 16015286601757825753n // ethereum-testnet-sepolia

const SimpleABI = [
	{
		inputs: [{ internalType: 'address[]', name: 'addresses', type: 'address[]' }],
		name: 'getNativeBalances',
		outputs: [{ internalType: 'uint256[]', name: '', type: 'uint256[]' }],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [],
		name: 'typeAndVersion',
		outputs: [{ internalType: 'string', name: '', type: 'string' }],
		stateMutability: 'view',
		type: 'function',
	},
] as const satisfies Abi

const ERC20ABI = [
	{
		inputs: [],
		name: 'totalSupply',
		outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
		name: 'balanceOf',
		outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
		stateMutability: 'view',
		type: 'function',
	},
] as const satisfies Abi

function hexToUint8Array(hex: string): Uint8Array {
	const clean = hex.startsWith('0x') ? hex.slice(2) : hex
	const bytes = new Uint8Array(clean.length / 2)
	for (let i = 0; i < clean.length; i += 2) {
		bytes[i / 2] = Number.parseInt(clean.slice(i, i + 2), 16)
	}
	return bytes
}

function makeCallContractRequest(to: Address, data: `0x${string}`) {
	return {
		$typeName: 'capabilities.blockchain.evm.v1alpha.CallContractRequest' as const,
		call: {
			$typeName: 'capabilities.blockchain.evm.v1alpha.CallMsg' as const,
			from: new Uint8Array(20),
			to: hexToUint8Array(to),
			data: hexToUint8Array(data),
		},
	}
}

describe('addContractMock', () => {
	describe('callContract routing', () => {
		test('routes calls by address and decodes/encodes correctly', () => {
			const evmMock = EvmMock.testInstance(CHAIN_SELECTOR)

			const mock = addContractMock(evmMock, {
				address: MOCK_ADDRESS_A,
				abi: SimpleABI,
			})

			mock.getNativeBalances = (addresses: unknown) => {
				return [500000000000000000n]
			}

			const callData = encodeFunctionData({
				abi: SimpleABI,
				functionName: 'getNativeBalances',
				args: [['0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa']],
			})

			const req = makeCallContractRequest(MOCK_ADDRESS_A, callData)
			const result = evmMock.callContract!(req as any)

			expect(result).toBeDefined()
			expect((result as any).data).toBeInstanceOf(Uint8Array)
		})

		test('routes no-arg functions correctly', () => {
			const evmMock = EvmMock.testInstance(CHAIN_SELECTOR)

			const mock = addContractMock(evmMock, {
				address: MOCK_ADDRESS_A,
				abi: SimpleABI,
			})

			mock.typeAndVersion = () => 'BalanceReader 1.0.0'

			const callData = encodeFunctionData({
				abi: SimpleABI,
				functionName: 'typeAndVersion',
			})

			const req = makeCallContractRequest(MOCK_ADDRESS_A, callData)
			const result = evmMock.callContract!(req as any)

			expect(result).toBeDefined()
			expect((result as any).data).toBeInstanceOf(Uint8Array)
		})

		test('chains multiple contract mocks on the same EvmMock', () => {
			const evmMock = EvmMock.testInstance(CHAIN_SELECTOR)

			const mockA = addContractMock(evmMock, {
				address: MOCK_ADDRESS_A,
				abi: SimpleABI,
			})

			const mockB = addContractMock(evmMock, {
				address: MOCK_ADDRESS_B,
				abi: ERC20ABI,
			})

			let calledA = false
			let calledB = false

			mockA.getNativeBalances = () => {
				calledA = true
				return [100n]
			}

			mockB.totalSupply = () => {
				calledB = true
				return 1000000000000000000n
			}

			const callDataA = encodeFunctionData({
				abi: SimpleABI,
				functionName: 'getNativeBalances',
				args: [['0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa']],
			})
			evmMock.callContract!(makeCallContractRequest(MOCK_ADDRESS_A, callDataA) as any)
			expect(calledA).toBe(true)

			const callDataB = encodeFunctionData({
				abi: ERC20ABI,
				functionName: 'totalSupply',
			})
			evmMock.callContract!(makeCallContractRequest(MOCK_ADDRESS_B, callDataB) as any)
			expect(calledB).toBe(true)
		})

		test('passes decoded arguments to handler', () => {
			const evmMock = EvmMock.testInstance(CHAIN_SELECTOR)

			const mock = addContractMock(evmMock, {
				address: MOCK_ADDRESS_A,
				abi: ERC20ABI,
			})

			let receivedAccount: unknown = null

			mock.balanceOf = (account: unknown) => {
				receivedAccount = account
				return 42n
			}

			const testAddress = '0xDeaDbeefdEAdbeefdEadbEEFdeadbeEFdEaDbeeF' as Address
			const callData = encodeFunctionData({
				abi: ERC20ABI,
				functionName: 'balanceOf',
				args: [testAddress],
			})

			evmMock.callContract!(makeCallContractRequest(MOCK_ADDRESS_A, callData) as any)

			expect(receivedAccount).toBeDefined()
			expect((receivedAccount as string).toLowerCase()).toBe(testAddress.toLowerCase())
		})

		test('throws when no handler is set for a function', () => {
			const evmMock = EvmMock.testInstance(CHAIN_SELECTOR)

			addContractMock(evmMock, {
				address: MOCK_ADDRESS_A,
				abi: ERC20ABI,
			})

			const callData = encodeFunctionData({
				abi: ERC20ABI,
				functionName: 'totalSupply',
			})

			expect(() =>
				evmMock.callContract!(makeCallContractRequest(MOCK_ADDRESS_A, callData) as any),
			).toThrow('no handler set for totalSupply')
		})

		test('throws when no mock is registered for address', () => {
			const evmMock = EvmMock.testInstance(CHAIN_SELECTOR)

			addContractMock(evmMock, {
				address: MOCK_ADDRESS_A,
				abi: ERC20ABI,
			})

			const callData = encodeFunctionData({
				abi: ERC20ABI,
				functionName: 'totalSupply',
			})

			const unknownAddress = '0x9999999999999999999999999999999999999999' as Address
			expect(() =>
				evmMock.callContract!(makeCallContractRequest(unknownAddress, callData) as any),
			).toThrow('no mock registered for address')
		})

		test('is case-insensitive for address matching', () => {
			const evmMock = EvmMock.testInstance(CHAIN_SELECTOR)

			const mock = addContractMock(evmMock, {
				address: '0xAbCdEf0123456789AbCdEf0123456789AbCdEf01' as Address,
				abi: ERC20ABI,
			})

			mock.totalSupply = () => 999n

			const callData = encodeFunctionData({
				abi: ERC20ABI,
				functionName: 'totalSupply',
			})

			const req = makeCallContractRequest(
				'0xabcdef0123456789abcdef0123456789abcdef01' as Address,
				callData,
			)

			const result = evmMock.callContract!(req as any)
			expect(result).toBeDefined()
		})
	})

	describe('writeReport routing', () => {
		test('routes writeReport by receiver address', () => {
			const evmMock = EvmMock.testInstance(CHAIN_SELECTOR)

			const mock = addContractMock(evmMock, {
				address: MOCK_ADDRESS_A,
				abi: SimpleABI,
			})

			let writeReportCalled = false

			mock.writeReport = (req) => {
				writeReportCalled = true
				return {
					txStatus: 'TX_STATUS_SUCCESS',
					txHash: '',
					errorMessage: '',
				}
			}

			const req = {
				$typeName: 'capabilities.blockchain.evm.v1alpha.WriteReportRequest' as const,
				receiver: hexToUint8Array(MOCK_ADDRESS_A),
				report: { rawReport: new Uint8Array(200) },
				gasConfig: { gasLimit: '1000000' },
			}

			const result = evmMock.writeReport!(req as any)
			expect(writeReportCalled).toBe(true)
			expect(result).toBeDefined()
		})

		test('chains writeReport for multiple contracts', () => {
			const evmMock = EvmMock.testInstance(CHAIN_SELECTOR)

			const mockA = addContractMock(evmMock, {
				address: MOCK_ADDRESS_A,
				abi: SimpleABI,
			})

			const mockB = addContractMock(evmMock, {
				address: MOCK_ADDRESS_B,
				abi: ERC20ABI,
			})

			let calledA = false
			let calledB = false

			mockA.writeReport = () => {
				calledA = true
				return { txStatus: 'TX_STATUS_SUCCESS' }
			}

			mockB.writeReport = () => {
				calledB = true
				return { txStatus: 'TX_STATUS_SUCCESS' }
			}

			const fakeReport: ReportResponseJson = {}
			const fakeGasConfig: GasConfigJson = { gasLimit: '1000000' }

			evmMock.writeReport!({
				receiver: hexToUint8Array(MOCK_ADDRESS_A),
				report: fakeReport,
				gasConfig: fakeGasConfig,
			} as any)
			expect(calledA).toBe(true)

			evmMock.writeReport!({
				receiver: hexToUint8Array(MOCK_ADDRESS_B),
				report: fakeReport,
				gasConfig: fakeGasConfig,
			} as any)
			expect(calledB).toBe(true)
		})

		test('throws when no writeReport handler is set', () => {
			const evmMock = EvmMock.testInstance(CHAIN_SELECTOR)

			addContractMock(evmMock, {
				address: MOCK_ADDRESS_A,
				abi: SimpleABI,
			})

			expect(() =>
				evmMock.writeReport!({
					receiver: hexToUint8Array(MOCK_ADDRESS_A),
				} as any),
			).toThrow('no writeReport handler set')
		})
	})

	describe('edge cases', () => {
		test('handles call data with exactly 4 bytes (selector only)', () => {
			const evmMock = EvmMock.testInstance(CHAIN_SELECTOR)

			const mock = addContractMock(evmMock, {
				address: MOCK_ADDRESS_A,
				abi: ERC20ABI,
			})

			mock.totalSupply = () => 0n

			const callData = encodeFunctionData({
				abi: ERC20ABI,
				functionName: 'totalSupply',
			})

			const result = evmMock.callContract!(makeCallContractRequest(MOCK_ADDRESS_A, callData) as any)
			expect(result).toBeDefined()
		})

		test('throws when call data is too short', () => {
			const evmMock = EvmMock.testInstance(CHAIN_SELECTOR)

			addContractMock(evmMock, {
				address: MOCK_ADDRESS_A,
				abi: ERC20ABI,
			})

			expect(() =>
				evmMock.callContract!({
					call: {
						to: hexToUint8Array(MOCK_ADDRESS_A),
						data: new Uint8Array([0x01, 0x02]),
						from: new Uint8Array(20),
					},
				} as any),
			).toThrow('call data too short')
		})

		test('returns empty mock object with no pre-set handlers', () => {
			const evmMock = EvmMock.testInstance(CHAIN_SELECTOR)
			const mock: ContractMock<typeof SimpleABI> = addContractMock(evmMock, {
				address: MOCK_ADDRESS_A,
				abi: SimpleABI,
			})

			expect(mock.getNativeBalances).toBeUndefined()
			expect(mock.typeAndVersion).toBeUndefined()
			expect(mock.writeReport).toBeUndefined()
		})
	})
})
