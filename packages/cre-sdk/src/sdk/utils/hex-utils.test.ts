import { describe, expect, it } from 'bun:test'
import { bigintToBytes, bytesToHex, hexToBase64, hexToBytes } from './hex-utils'

describe('hexToBytes', () => {
	describe('happy paths', () => {
		it('converts valid hex string to bytes', () => {
			const result = hexToBytes('0x48656c6c6f')
			expect(result).toEqual(new Uint8Array([72, 101, 108, 108, 111])) // "Hello"
		})

		it('converts empty hex string', () => {
			const result = hexToBytes('0x')
			expect(result).toEqual(new Uint8Array([]))
		})

		it('converts hex with uppercase characters', () => {
			const result = hexToBytes('0xDEADBEEF')
			expect(result).toEqual(new Uint8Array([222, 173, 190, 239]))
		})

		it('converts hex with lowercase characters', () => {
			const result = hexToBytes('0xdeadbeef')
			expect(result).toEqual(new Uint8Array([222, 173, 190, 239]))
		})

		it('converts hex with mixed case', () => {
			const result = hexToBytes('0xDeAdBeEf')
			expect(result).toEqual(new Uint8Array([222, 173, 190, 239]))
		})

		it('converts single byte', () => {
			const result = hexToBytes('0xff')
			expect(result).toEqual(new Uint8Array([255]))
		})

		it('converts zero byte', () => {
			const result = hexToBytes('0x00')
			expect(result).toEqual(new Uint8Array([0]))
		})

		it('converts multiple zero bytes', () => {
			const result = hexToBytes('0x000000')
			expect(result).toEqual(new Uint8Array([0, 0, 0]))
		})
	})

	describe('invalid inputs', () => {
		it('rejects hex without 0x prefix', () => {
			expect(() => hexToBytes('48656c6c6f')).toThrow('Invalid hex string: 48656c6c6f')
		})

		it('rejects hex with invalid characters (0xZZZZ)', () => {
			expect(() => hexToBytes('0xZZZZ')).toThrow('Invalid hex string: 0xZZZZ')
		})

		it('rejects hex with special characters', () => {
			expect(() => hexToBytes('0xAB@D')).toThrow('Invalid hex string: 0xAB@D')
		})

		it('rejects hex with spaces', () => {
			expect(() => hexToBytes('0xAB CD')).toThrow('Invalid hex string: 0xAB CD')
		})

		it('rejects hex with odd length (0xABC)', () => {
			expect(() => hexToBytes('0xABC')).toThrow(
				'Hex string must have an even number of characters: 0xABC',
			)
		})

		it('rejects hex with odd length (single character)', () => {
			expect(() => hexToBytes('0xA')).toThrow(
				'Hex string must have an even number of characters: 0xA',
			)
		})

		it('rejects hex with odd length (multiple odd)', () => {
			expect(() => hexToBytes('0x12345')).toThrow(
				'Hex string must have an even number of characters: 0x12345',
			)
		})

		it('rejects hex with dash separator', () => {
			expect(() => hexToBytes('0xAB-CD')).toThrow('Invalid hex string: 0xAB-CD')
		})

		it('rejects hex with colon separator', () => {
			expect(() => hexToBytes('0xAB:CD')).toThrow('Invalid hex string: 0xAB:CD')
		})

		it('rejects hex with newline', () => {
			expect(() => hexToBytes('0xAB\nCD')).toThrow('Invalid hex string: 0xAB\nCD')
		})

		it('rejects hex with tab', () => {
			expect(() => hexToBytes('0xAB\tCD')).toThrow('Invalid hex string: 0xAB\tCD')
		})

		it('rejects hex with letters outside hex range (G-Z)', () => {
			expect(() => hexToBytes('0xGHIJ')).toThrow('Invalid hex string: 0xGHIJ')
		})

		it('rejects hex with underscore', () => {
			expect(() => hexToBytes('0xAB_CD')).toThrow('Invalid hex string: 0xAB_CD')
		})
	})
})

describe('bytesToHex', () => {
	describe('happy paths', () => {
		it('converts bytes to hex string', () => {
			const bytes = new Uint8Array([72, 101, 108, 108, 111])
			const result = bytesToHex(bytes)
			expect(result).toBe('0x48656c6c6f')
		})

		it('converts empty byte array', () => {
			const bytes = new Uint8Array([])
			const result = bytesToHex(bytes)
			expect(result).toBe('0x')
		})

		it('converts single byte', () => {
			const bytes = new Uint8Array([255])
			const result = bytesToHex(bytes)
			expect(result).toBe('0xff')
		})

		it('converts zero byte', () => {
			const bytes = new Uint8Array([0])
			const result = bytesToHex(bytes)
			expect(result).toBe('0x00')
		})

		it('converts multiple zero bytes', () => {
			const bytes = new Uint8Array([0, 0, 0])
			const result = bytesToHex(bytes)
			expect(result).toBe('0x000000')
		})

		it('pads single digit hex values with zero', () => {
			const bytes = new Uint8Array([1, 2, 3, 15])
			const result = bytesToHex(bytes)
			expect(result).toBe('0x0102030f')
		})

		it('converts max byte value', () => {
			const bytes = new Uint8Array([255, 255])
			const result = bytesToHex(bytes)
			expect(result).toBe('0xffff')
		})
	})

	describe('roundtrip conversion', () => {
		it('hexToBytes -> bytesToHex preserves value', () => {
			const original = '0xdeadbeef'
			const bytes = hexToBytes(original)
			const result = bytesToHex(bytes)
			expect(result).toBe(original)
		})

		it('bytesToHex -> hexToBytes preserves value', () => {
			const original = new Uint8Array([1, 2, 3, 4, 5])
			const hex = bytesToHex(original)
			const result = hexToBytes(hex)
			expect(result).toEqual(original)
		})
	})
})

describe('hexToBase64', () => {
	describe('happy paths', () => {
		it('converts hex with 0x prefix to base64', () => {
			const result = hexToBase64('0x48656c6c6f')
			expect(result).toBe('SGVsbG8=') // "Hello" in base64
		})

		it('converts hex without 0x prefix to base64', () => {
			const result = hexToBase64('48656c6c6f')
			expect(result).toBe('SGVsbG8=')
		})

		it('converts empty hex string', () => {
			const result = hexToBase64('0x')
			expect(result).toBe('')
		})

		it('converts empty hex string without prefix', () => {
			const result = hexToBase64('')
			expect(result).toBe('')
		})

		it('converts uppercase hex', () => {
			const result = hexToBase64('0xDEADBEEF')
			expect(result).toBe('3q2+7w==')
		})

		it('converts lowercase hex', () => {
			const result = hexToBase64('0xdeadbeef')
			expect(result).toBe('3q2+7w==')
		})

		it('converts single byte', () => {
			const result = hexToBase64('0xff')
			expect(result).toBe('/w==')
		})

		it('converts multiple bytes', () => {
			const result = hexToBase64('0x010203')
			expect(result).toBe('AQID')
		})

		it('handles zero bytes', () => {
			const result = hexToBase64('0x000000')
			expect(result).toBe('AAAA')
		})
	})

	describe('roundtrip with hexToBytes', () => {
		it('hexToBytes result matches hexToBase64 input', () => {
			const hex = '0xdeadbeef'
			const bytes = hexToBytes(hex)
			const base64FromHex = hexToBase64(hex)
			const base64FromBytes = Buffer.from(bytes).toString('base64')
			expect(base64FromHex).toBe(base64FromBytes)
		})
	})
})

describe('bigintToBytes', () => {
	it('returns empty array for zero', () => {
		expect(bigintToBytes(0n)).toEqual(new Uint8Array())
	})

	it('converts small numbers', () => {
		expect(bigintToBytes(123n)).toEqual(new Uint8Array([123]))
	})

	it('converts numbers requiring padding', () => {
		// 15 = 0xf (single hex char needs padding to 0x0f)
		expect(bigintToBytes(15n)).toEqual(new Uint8Array([15]))
	})

	it('converts realistic block numbers', () => {
		// 9768438 = 0x950df6
		expect(bigintToBytes(9768438n)).toEqual(new Uint8Array([0x95, 0x0d, 0xf6]))
	})

	it('handles large block numbers', () => {
		// 21000000 = 0x1406f40
		expect(bigintToBytes(21000000n)).toEqual(new Uint8Array([0x01, 0x40, 0x6f, 0x40]))
	})
})
