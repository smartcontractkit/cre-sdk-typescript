import { describe, expect, test } from 'bun:test'
import { EVMClient } from '@cre/sdk/cre'
import {
	blockNumber,
	type EncodeCallMsgPayload,
	EVM_DEFAULT_REPORT_ENCODER,
	encodeCallMsg,
	isChainSelectorSupported,
	LAST_FINALIZED_BLOCK_NUMBER,
	LATEST_BLOCK_NUMBER,
	prepareReportRequest,
} from './blockchain-helpers'

describe('blockchain-helpers', () => {
	describe('blockNumber', () => {
		test('should correct encode number', () => {
			const result = blockNumber(123)
			// 123 in hex is 7b. base64 of 7b is ew==
			expect(result).toEqual({
				absVal: Buffer.from([123]).toString('base64'),
			})
		})

		test('should correct encode string', () => {
			const result = blockNumber('123')
			expect(result).toEqual({
				absVal: Buffer.from([123]).toString('base64'),
			})
		})

		test('should correct encode bigint', () => {
			const result = blockNumber(123n)
			expect(result).toEqual({
				absVal: Buffer.from([123]).toString('base64'),
			})
		})

		test('should correct encode zero', () => {
			const result = blockNumber(0)
			expect(result).toEqual({}) // Empty absVal is omitted by toJson
		})

		test('should handle negative numbers by taking absolute value', () => {
			const result = blockNumber(-123)
			expect(result).toEqual({
				absVal: Buffer.from([123]).toString('base64'),
			})
		})

		test('should handle realistic large block numbers', () => {
			// Block number 9768438
			// Hex: 950DF6
			// Bytes: [149, 13, 246]
			const num = 9768438
			const result = blockNumber(num)
			expect(result).toEqual({
				absVal: Buffer.from([0x95, 0x0d, 0xf6]).toString('base64'),
			})

			// Verify with string input
			const resultStr = blockNumber('9768438')
			expect(resultStr).toEqual(result)

			// Verify with bigint input
			const resultBigInt = blockNumber(9768438n)
			expect(resultBigInt).toEqual(result)
		})
	})

	describe('LAST_FINALIZED_BLOCK_NUMBER', () => {
		test('should have correct structure for finalized block', () => {
			expect(LAST_FINALIZED_BLOCK_NUMBER).toEqual({
				absVal: Buffer.from([3]).toString('base64'),
				sign: '-1',
			})
		})

		test('should encode value 3 as base64', () => {
			expect(LAST_FINALIZED_BLOCK_NUMBER.absVal).toBe('Aw==')
		})
	})

	describe('LATEST_BLOCK_NUMBER', () => {
		test('should have correct structure for latest block', () => {
			expect(LATEST_BLOCK_NUMBER).toEqual({
				absVal: Buffer.from([2]).toString('base64'),
				sign: '-1',
			})
		})

		test('should encode value 2 as base64', () => {
			expect(LATEST_BLOCK_NUMBER.absVal).toBe('Ag==')
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
			expect(typeof result.from).toBe('string')
			expect(typeof result.to).toBe('string')
			expect(typeof result.data).toBe('string')
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
			expect(result.data).toBeDefined() // Empty hex should encode to empty string
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

		test('should encode payload as base64', () => {
			const hexPayload = '0x00' as const

			const result = prepareReportRequest(hexPayload)

			expect(typeof result.encodedPayload).toBe('string')
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
