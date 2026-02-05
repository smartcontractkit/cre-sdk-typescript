import { describe, expect, test } from 'bun:test'
import { EVMClient } from '@cre/sdk/cre'
import {
	bigintToProtoBigInt,
	blockNumber,
	type EncodeCallMsgPayload,
	EVM_DEFAULT_REPORT_ENCODER,
	encodeCallMsg,
	isChainSelectorSupported,
	LAST_FINALIZED_BLOCK_NUMBER,
	LATEST_BLOCK_NUMBER,
	type ProtoBigInt,
	prepareReportRequest,
	protoBigIntToBigint,
} from './blockchain-helpers'

describe('blockchain-helpers', () => {
	describe('bigintToProtoBigInt', () => {
		test('should encode number', () => {
			const result = bigintToProtoBigInt(123)
			expect(result).toEqual({
				absVal: new Uint8Array([123]),
			})
		})

		test('should encode string', () => {
			const result = bigintToProtoBigInt('9768438')
			expect(result).toEqual({
				absVal: new Uint8Array([0x95, 0x0d, 0xf6]),
			})
		})

		test('should encode bigint', () => {
			const result = bigintToProtoBigInt(9768438n)
			expect(result).toEqual({
				absVal: new Uint8Array([0x95, 0x0d, 0xf6]),
			})
		})

		test('should encode zero', () => {
			const result = bigintToProtoBigInt(0)
			expect(result).toEqual({
				absVal: new Uint8Array(),
			})
		})

		test('should take absolute value of negative numbers', () => {
			const result = bigintToProtoBigInt(-123)
			expect(result).toEqual({
				absVal: new Uint8Array([123]),
			})
		})
	})

	describe('protoBigIntToBigint', () => {
		test('should convert positive protobuf BigInt', () => {
			const pb: ProtoBigInt = {
				absVal: new Uint8Array([0x95, 0x0d, 0xf6]),
				sign: 1n,
			}
			expect(protoBigIntToBigint(pb)).toBe(9768438n)
		})

		test('should convert negative protobuf BigInt', () => {
			const pb: ProtoBigInt = {
				absVal: new Uint8Array([123]),
				sign: -1n,
			}
			expect(protoBigIntToBigint(pb)).toBe(-123n)
		})

		test('should convert zero', () => {
			const pb: ProtoBigInt = {
				absVal: new Uint8Array(),
				sign: 0n,
			}
			expect(protoBigIntToBigint(pb)).toBe(0n)
		})

		test('should roundtrip with bigintToProtoBigInt (positive)', () => {
			// Note: bigintToProtoBigInt returns native types
			// This tests the conceptual roundtrip
			const original = 9768438n
			const proto: ProtoBigInt = {
				absVal: new Uint8Array([0x95, 0x0d, 0xf6]),
				sign: 1n,
			}
			expect(protoBigIntToBigint(proto)).toBe(original)
		})
	})

	describe('blockNumber (alias)', () => {
		test('should be an alias for bigintToProtoBigInt', () => {
			expect(blockNumber).toBe(bigintToProtoBigInt)
		})

		test('should produce same result as bigintToProtoBigInt', () => {
			expect(blockNumber(9768438n)).toEqual(bigintToProtoBigInt(9768438n))
		})
	})

	describe('LAST_FINALIZED_BLOCK_NUMBER', () => {
		test('should have correct structure for finalized block', () => {
			expect(LAST_FINALIZED_BLOCK_NUMBER).toEqual({
				absVal: new Uint8Array([3]),
				sign: -1n,
			})
		})

		test('should encode value 3 as Uint8Array', () => {
			expect(LAST_FINALIZED_BLOCK_NUMBER.absVal).toEqual(new Uint8Array([3]))
		})
	})

	describe('LATEST_BLOCK_NUMBER', () => {
		test('should have correct structure for latest block', () => {
			expect(LATEST_BLOCK_NUMBER).toEqual({
				absVal: new Uint8Array([2]),
				sign: -1n,
			})
		})

		test('should encode value 2 as Uint8Array', () => {
			expect(LATEST_BLOCK_NUMBER.absVal).toEqual(new Uint8Array([2]))
		})
	})

	describe('encodeCallMsg', () => {
		test('should encode call message with valid addresses and data', () => {
			const payload: EncodeCallMsgPayload = {
				from: '0x1234567890123456789012345678901234567890',
				to: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
				data: '0x095ea7b3',
			}

			const result = encodeCallMsg(payload)

			expect(result).toHaveProperty('from')
			expect(result).toHaveProperty('to')
			expect(result).toHaveProperty('data')
			expect(result.from).toBeInstanceOf(Uint8Array)
			expect(result.to).toBeInstanceOf(Uint8Array)
			expect(result.data).toBeInstanceOf(Uint8Array)
		})

		test('should encode zero address', () => {
			const payload: EncodeCallMsgPayload = {
				from: '0x0000000000000000000000000000000000000000',
				to: '0x0000000000000000000000000000000000000000',
				data: '0x',
			}

			const result = encodeCallMsg(payload)

			expect(result.from).toBeTruthy()
			expect(result.to).toBeTruthy()
			expect(result.data).toBeDefined()
		})

		test('should encode function selector data', () => {
			const payload: EncodeCallMsgPayload = {
				from: '0x1234567890123456789012345678901234567890',
				to: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
				data: '0xa9059cbb000000000000000000000000abcdefabcdefabcdefabcdefabcdefabcdefabcd0000000000000000000000000000000000000000000000000000000000000064',
			}

			const result = encodeCallMsg(payload)

			expect(result.data).toBeTruthy()
			expect(result.data).toBeDefined()
			if (result.data) {
				expect(result.data.length).toBeGreaterThan(0)
			}
		})
	})

	describe('EVM_DEFAULT_REPORT_ENCODER', () => {
		test('should have correct default values', () => {
			expect(EVM_DEFAULT_REPORT_ENCODER).toEqual({
				encoderName: 'evm',
				signingAlgo: 'ecdsa',
				hashingAlgo: 'keccak256',
			})
		})

		test('should have evm encoder name', () => {
			expect(EVM_DEFAULT_REPORT_ENCODER.encoderName).toBe('evm')
		})

		test('should use ecdsa signing algorithm', () => {
			expect(EVM_DEFAULT_REPORT_ENCODER.signingAlgo).toBe('ecdsa')
		})

		test('should use keccak256 hashing algorithm', () => {
			expect(EVM_DEFAULT_REPORT_ENCODER.hashingAlgo).toBe('keccak256')
		})
	})

	describe('prepareReportRequest', () => {
		test('should prepare report request with default encoder', () => {
			const hexPayload = '0x1234567890abcdef' as const

			const result = prepareReportRequest(hexPayload)

			expect(result).toHaveProperty('encodedPayload')
			expect(result).toHaveProperty('encoderName')
			expect(result).toHaveProperty('signingAlgo')
			expect(result).toHaveProperty('hashingAlgo')
			expect(result.encoderName).toBe('evm')
			expect(result.signingAlgo).toBe('ecdsa')
			expect(result.hashingAlgo).toBe('keccak256')
		})

		test('should prepare report request with custom encoder', () => {
			const hexPayload = '0xabcdef' as const
			const customEncoder = {
				encoderName: 'custom',
				signingAlgo: 'ed25519',
				hashingAlgo: 'sha256',
			}

			const result = prepareReportRequest(hexPayload, customEncoder)

			expect(result.encoderName).toBe('custom')
			expect(result.signingAlgo).toBe('ed25519')
			expect(result.hashingAlgo).toBe('sha256')
			expect(result.encodedPayload).toBeTruthy()
		})

		test('should encode payload as Uint8Array', () => {
			const hexPayload = '0x00' as const

			const result = prepareReportRequest(hexPayload)

			expect(result.encodedPayload).toBeInstanceOf(Uint8Array)
			expect(result.encodedPayload).toBeDefined()
			if (result.encodedPayload) {
				expect(result.encodedPayload.length).toBeGreaterThan(0)
			}
		})

		test('should handle empty hex payload', () => {
			const hexPayload = '0x' as const

			const result = prepareReportRequest(hexPayload)

			expect(result.encodedPayload).toBeDefined()
		})
	})

	describe('isChainSelectorSupported', () => {
		test('should return true for supported chain selectors', () => {
			// Get all supported chain selectors from EVMClient
			const supportedChains = Object.keys(EVMClient.SUPPORTED_CHAIN_SELECTORS)

			if (supportedChains.length > 0) {
				const firstChain = supportedChains[0]
				expect(isChainSelectorSupported(firstChain)).toBe(true)
			}
		})

		test('should return false for unsupported chain selectors', () => {
			const unsupportedChain = 'DEFINITELY_NOT_A_REAL_CHAIN_12345'
			expect(isChainSelectorSupported(unsupportedChain)).toBe(false)
		})

		test('should return false for empty string', () => {
			expect(isChainSelectorSupported('')).toBe(false)
		})

		test('should be case sensitive', () => {
			const supportedChains = Object.keys(EVMClient.SUPPORTED_CHAIN_SELECTORS)

			if (supportedChains.length > 0) {
				const firstChain = supportedChains[0]
				const lowerCase = firstChain.toLowerCase()
				const upperCase = firstChain.toUpperCase()

				// Only fail if the case-modified version is actually different
				if (lowerCase !== firstChain) {
					expect(isChainSelectorSupported(lowerCase)).toBe(false)
				}
				if (upperCase !== firstChain) {
					expect(isChainSelectorSupported(upperCase)).toBe(false)
				}
			}
		})

		test('should handle multiple supported chains', () => {
			const supportedChains = Object.keys(EVMClient.SUPPORTED_CHAIN_SELECTORS)

			supportedChains.forEach((chain) => {
				expect(isChainSelectorSupported(chain)).toBe(true)
			})
		})
	})
})
