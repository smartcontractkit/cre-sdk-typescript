/**
 * Hex conversion utilities for blockchain data
 *
 * Note: BigInt utilities are available in @cre/sdk/utils
 * Use val.bigint() or bigIntToProtoBigInt() for BigInt conversions
 */
import type { Hex } from 'viem'

/**
 * Convert hex string to Uint8Array
 */
export const hexToBytes = (hexStr: string): Uint8Array => {
	if (!hexStr.startsWith('0x')) {
		throw new Error(`Invalid hex string: ${hexStr}`)
	}

	// Validate hexadecimal characters
	if (!/^0x[0-9a-fA-F]*$/.test(hexStr)) {
		throw new Error(`Invalid hex string: ${hexStr}`)
	}

	// Validate even length
	if ((hexStr.length - 2) % 2 !== 0) {
		throw new Error(`Hex string must have an even number of characters: ${hexStr}`)
	}

	const hex = hexStr.slice(2)
	const bytes = new Uint8Array(hex.length / 2)
	for (let i = 0; i < hex.length; i += 2) {
		bytes[i / 2] = Number.parseInt(hex.slice(i, i + 2), 16)
	}
	return bytes
}

/**
 * Convert Uint8Array to hex string with 0x prefix
 */
export const bytesToHex = (bytes: Uint8Array): Hex => {
	return `0x${Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('')}`
}

/**
 * Encode hex as base64 string
 * @param hex
 * @returns
 */
export const hexToBase64 = (hex: string): string => {
	const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex
	return Buffer.from(cleanHex, 'hex').toString('base64')
}

/**
 * Convert a bigint to a Uint8Array (big-endian byte order).
 * Returns empty array for 0n.
 */
export const bigintToBytes = (n: bigint): Uint8Array => {
	if (n === 0n) {
		return new Uint8Array()
	}
	const hex = n.toString(16)
	return Buffer.from(hex.padStart(hex.length + (hex.length % 2), '0'), 'hex')
}

/**
 * Convert a Uint8Array (big-endian byte order) to a native bigint.
 * Returns 0n for empty array.
 *
 * This is the inverse of `bigintToBytes` and is useful for converting
 * protobuf BigInt's `absVal` field back to a native JS bigint.
 *
 * @example
 * // Convert protobuf BigInt from headerByNumber response
 * const latestBlockNum = bytesToBigint(latestHeader.header.blockNumber!.absVal)
 */
export const bytesToBigint = (bytes: Uint8Array): bigint => {
	let result = 0n
	for (const byte of bytes) {
		result = (result << 8n) + BigInt(byte)
	}
	return result
}
