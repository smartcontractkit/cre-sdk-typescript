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
	const hex = hexStr.slice(2)
	const bytes = new Uint8Array(hex.length / 2)
	for (let i = 0; i < hex.length; i += 2) {
		bytes[i / 2] = Number.parseInt(hex.substr(i, 2), 16)
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
