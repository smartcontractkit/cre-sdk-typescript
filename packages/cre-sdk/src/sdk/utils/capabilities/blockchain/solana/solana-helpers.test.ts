import { describe, expect, test } from 'bun:test'
import { sha256 } from '@noble/hashes/sha2.js'
import {
	anchorCPILogTriggerConfig,
	calculateAccountsHash,
	encodeBorshVecU32,
	encodeForwarderReport,
	prepareSolanaReportRequest,
	prepareSubkeyFloatValue,
	prepareSubkeyValue,
	SOLANA_DEFAULT_REPORT_ENCODER,
	solanaAccountMeta,
	solanaAccountMetasToJson,
	solanaAddressToBytes,
} from './solana-helpers'

// sha256 of zero bytes — pins @noble/hashes against a known external vector.
const SHA256_EMPTY_HEX = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'

const bytesToHex = (bytes: Uint8Array): string =>
	Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('')

const sequentialKey = (start: number): Uint8Array =>
	new Uint8Array(Array.from({ length: 32 }, (_, i) => i + start))

describe('encodeForwarderReport', () => {
	// Byte vector lifted from Go bindings common_test.go TestForwarderReport_Marshal.
	test('encodes to expected Borsh format', () => {
		const hash = sequentialKey(1) // 0x01..0x20
		const payload = new TextEncoder().encode('hello solana')

		const data = encodeForwarderReport({ accountHash: hash, payload })

		// Borsh format: account_hash(32) | payload_len(u32 LE) | payload
		expect(data.length).toBe(32 + 4 + payload.length)
		expect(data.subarray(0, 32)).toEqual(hash)
		expect(Array.from(data.subarray(32, 36))).toEqual([12, 0, 0, 0]) // u32-LE 12
		expect(data.subarray(36)).toEqual(payload)
	})

	test('encodes empty payload', () => {
		const data = encodeForwarderReport({
			accountHash: new Uint8Array(32),
			payload: new Uint8Array(),
		})
		expect(data.length).toBe(36)
		expect(Array.from(data.subarray(32, 36))).toEqual([0, 0, 0, 0])
	})

	test('rejects accountHash that is not 32 bytes', () => {
		expect(() =>
			encodeForwarderReport({
				accountHash: new Uint8Array(31),
				payload: new Uint8Array(),
			}),
		).toThrow('accountHash must be exactly 32 bytes')
	})
})

describe('calculateAccountsHash', () => {
	// Cases mirror Go bindings common_test.go TestCalculateAccountsHash.
	test('single account', () => {
		const key = sequentialKey(0)
		const got = calculateAccountsHash([{ publicKey: key, isWritable: false }])
		expect(got).toEqual(sha256(key))
	})

	test('multiple accounts hash concatenated keys', () => {
		const key1 = sequentialKey(0)
		const key2 = sequentialKey(32)
		const got = calculateAccountsHash([
			{ publicKey: key1, isWritable: false },
			{ publicKey: key2, isWritable: true },
		])
		const concat = new Uint8Array(64)
		concat.set(key1, 0)
		concat.set(key2, 32)
		expect(got).toEqual(sha256(concat))
	})

	test('empty slice hashes empty input', () => {
		const got = calculateAccountsHash([])
		expect(bytesToHex(got)).toBe(SHA256_EMPTY_HEX)
	})

	test('skips nullish entries', () => {
		const key = sequentialKey(100)
		const got = calculateAccountsHash([null, { publicKey: key, isWritable: false }, undefined])
		expect(got).toEqual(sha256(key))
	})

	test('order matters', () => {
		const key1 = sequentialKey(0)
		const key2 = sequentialKey(32)
		const hash12 = calculateAccountsHash([{ publicKey: key1 }, { publicKey: key2 }])
		const hash21 = calculateAccountsHash([{ publicKey: key2 }, { publicKey: key1 }])
		expect(hash12).not.toEqual(hash21)
	})
})

describe('encodeBorshVecU32', () => {
	// Wire format mirrors Go's generated EncodeBorshVecU32: [u32-LE count][concat elements].
	test('empty vec is just a zero count', () => {
		expect(Array.from(encodeBorshVecU32([]))).toEqual([0, 0, 0, 0])
	})

	test('single element', () => {
		const elem = new Uint8Array([0xaa, 0xbb, 0xcc])
		expect(Array.from(encodeBorshVecU32([elem]))).toEqual([1, 0, 0, 0, 0xaa, 0xbb, 0xcc])
	})

	test('multiple elements concatenate in order', () => {
		const a = new Uint8Array([1, 2])
		const b = new Uint8Array([3])
		const c = new Uint8Array([4, 5, 6])
		expect(Array.from(encodeBorshVecU32([a, b, c]))).toEqual([3, 0, 0, 0, 1, 2, 3, 4, 5, 6])
	})
})

describe('prepareSolanaReportRequest', () => {
	test('base64-encodes payload bytes with the Solana default encoder', () => {
		const payload = new Uint8Array([0x00, 0x01, 0xfe, 0xff])
		const request = prepareSolanaReportRequest(payload)
		expect(request.encodedPayload).toBe(Buffer.from(payload).toString('base64'))
		expect(request.encoderName).toBe('solana')
		expect(request.signingAlgo).toBe('ecdsa')
		expect(request.hashingAlgo).toBe('keccak256')
	})

	test('binary payloads survive the base64 round-trip exactly', () => {
		const payload = new Uint8Array(256)
		for (let i = 0; i < 256; i++) payload[i] = i
		const request = prepareSolanaReportRequest(payload)
		expect(new Uint8Array(Buffer.from(request.encodedPayload as string, 'base64'))).toEqual(payload)
	})

	test('allows a custom encoder', () => {
		const request = prepareSolanaReportRequest(new Uint8Array([1]), {
			...SOLANA_DEFAULT_REPORT_ENCODER,
			hashingAlgo: 'sha256',
		})
		expect(request.hashingAlgo).toBe('sha256')
	})
})

describe('solanaAddressToBytes / solanaAccountMeta', () => {
	const BASE58_ADDRESS = 'ECL8142j2YQAvs9R9geSsRnkVH2wLEi7soJCRyJ74cfL'

	test('decodes a base58 address to 32 bytes', () => {
		const bytes = solanaAddressToBytes(BASE58_ADDRESS)
		expect(bytes.length).toBe(32)
	})

	test('rejects an invalid base58 address', () => {
		expect(() => solanaAddressToBytes('not-an-address')).toThrow()
	})

	test('builds an AccountMeta from a base58 string', () => {
		const meta = solanaAccountMeta(BASE58_ADDRESS, true)
		expect(meta.publicKey).toEqual(solanaAddressToBytes(BASE58_ADDRESS))
		expect(meta.isWritable).toBe(true)
	})

	test('builds an AccountMeta from raw bytes, not writable by default', () => {
		const key = sequentialKey(0)
		const meta = solanaAccountMeta(key)
		expect(meta.publicKey).toEqual(key)
		expect(meta.isWritable).toBe(false)
	})

	test('solanaAccountMetasToJson converts to base64 protobuf JSON shape', () => {
		const key = sequentialKey(0)
		const json = solanaAccountMetasToJson([solanaAccountMeta(key, true)])
		expect(json).toEqual([{ publicKey: Buffer.from(key).toString('base64'), isWritable: true }])
	})
})

describe('prepareSubkeyValue', () => {
	// Cases mirror Go bindings common_test.go TestPrepareSubkeyValue.
	test('string encodes as UTF-8 bytes', () => {
		expect(prepareSubkeyValue('hello')).toEqual(new TextEncoder().encode('hello'))
	})

	test('bytes pass through as-is', () => {
		const input = new Uint8Array([1, 2, 3])
		expect(prepareSubkeyValue(input)).toBe(input)
	})

	test('bigint encodes as big-endian u64', () => {
		expect(bytesToHex(prepareSubkeyValue(1000n))).toBe('00000000000003e8')
	})

	test("negative bigint encodes as two's complement", () => {
		expect(bytesToHex(prepareSubkeyValue(-1n))).toBe('ffffffffffffffff')
	})

	test('small integer number widens to 8 bytes', () => {
		expect(bytesToHex(prepareSubkeyValue(5))).toBe('0000000000000005')
	})

	test('non-integer number throws, pointing at the float encoder', () => {
		expect(() => prepareSubkeyValue(1.5)).toThrow('prepareSubkeyFloatValue')
	})
})

describe('prepareSubkeyFloatValue', () => {
	// Vectors mirror Go bindings EncodeIndexedValue float encoding:
	// positive → float64bits + 2^63, otherwise 2^63 - float64bits (mod 2^64).
	test('positive float', () => {
		// float64bits(1.5) = 0x3ff8000000000000; + 2^63
		expect(bytesToHex(prepareSubkeyFloatValue(1.5))).toBe('bff8000000000000')
	})

	test('negative float', () => {
		// 2^63 - float64bits(-1.5) mod 2^64
		expect(bytesToHex(prepareSubkeyFloatValue(-1.5))).toBe('c008000000000000')
	})

	test('zero maps to the sign bit', () => {
		expect(bytesToHex(prepareSubkeyFloatValue(0))).toBe('8000000000000000')
	})

	test('encoding preserves ordering among same-sign values', () => {
		const positives = [0.5, 1.5, 2.5, 100].map((v) => bytesToHex(prepareSubkeyFloatValue(v)))
		expect([...positives].sort()).toEqual(positives)
		const negatives = [-100, -2.5, -1.5, -0.5].map((v) => bytesToHex(prepareSubkeyFloatValue(v)))
		expect([...negatives].sort()).toEqual(negatives)
	})
})

describe('anchorCPILogTriggerConfig', () => {
	// Mirrors Go bindings common_test.go TestAnchorCPILogTriggerConfig.
	test('targets the program itself with the anchor:event method', () => {
		const programId = sequentialKey(0)
		const cfg = anchorCPILogTriggerConfig(programId)
		expect(cfg.destAddress).toBe(Buffer.from(programId).toString('base64'))
		expect(cfg.methodName).toBe(Buffer.from('anchor:event').toString('base64'))
	})

	test('accepts a base58 program id', () => {
		const base58 = 'ECL8142j2YQAvs9R9geSsRnkVH2wLEi7soJCRyJ74cfL'
		const cfg = anchorCPILogTriggerConfig(base58)
		expect(cfg.destAddress).toBe(Buffer.from(solanaAddressToBytes(base58)).toString('base64'))
	})
})
