import { describe, expect, it } from 'bun:test'
import { decodeJson } from './decode-json'

describe('decodeJson', () => {
	describe('valid JSON inputs', () => {
		it('should decode a simple object', () => {
			const input = { name: 'test', value: 123 }
			const encoded = new TextEncoder().encode(JSON.stringify(input))
			expect(decodeJson(encoded)).toEqual(input)
		})

		it('should decode an array', () => {
			const input = [1, 2, 3, 'test', true]
			const encoded = new TextEncoder().encode(JSON.stringify(input))
			expect(decodeJson(encoded)).toEqual(input)
		})

		it('should decode a nested object', () => {
			const input = {
				user: {
					name: 'John Wick',
					age: 30,
					address: {
						street: '123 Main St',
						city: 'New York',
					},
				},
				active: true,
			}
			const encoded = new TextEncoder().encode(JSON.stringify(input))
			expect(decodeJson(encoded)).toEqual(input)
		})

		it('should decode JSON with special characters', () => {
			const input = {
				message: 'Hello "World"!',
				path: 'C:\\Users\\test',
				newline: 'line1\nline2',
			}
			const encoded = new TextEncoder().encode(JSON.stringify(input))
			expect(decodeJson(encoded)).toEqual(input)
		})

		it('should decode JSON with unicode characters', () => {
			const input = {
				emoji: '🚀',
				chinese: 'źdźbło chrabąszcza',
				mixed: 'Hello 世界 🌍',
			}
			const encoded = new TextEncoder().encode(JSON.stringify(input))
			expect(decodeJson(encoded)).toEqual(input)
		})

		it('should decode JSON primitive null', () => {
			const input = null
			const encoded = new TextEncoder().encode(JSON.stringify(input))
			expect(decodeJson(encoded)).toBeNull()
		})

		it('should decode JSON primitive boolean', () => {
			const input = true
			const encoded = new TextEncoder().encode(JSON.stringify(input))
			expect(decodeJson(encoded)).toBe(true)
		})

		it('should decode JSON primitive number', () => {
			const input = 42.5
			const encoded = new TextEncoder().encode(JSON.stringify(input))
			expect(decodeJson(encoded)).toBe(input)
		})

		it('should decode JSON primitive string', () => {
			const input = 'hello world'
			const encoded = new TextEncoder().encode(JSON.stringify(input))
			expect(decodeJson(encoded)).toBe(input)
		})

		it('should decode an empty object', () => {
			const input = {}
			const encoded = new TextEncoder().encode(JSON.stringify(input))
			expect(decodeJson(encoded)).toEqual(input)
		})

		it('should decode an empty array', () => {
			const input: unknown[] = []
			const encoded = new TextEncoder().encode(JSON.stringify(input))
			expect(decodeJson(encoded)).toEqual(input)
		})
	})

	describe('invalid JSON inputs', () => {
		it('should throw error for invalid JSON', () => {
			const encoded = new TextEncoder().encode('invalid json')
			expect(() => decodeJson(encoded)).toThrow()
		})

		it('should throw error for incomplete JSON object', () => {
			const encoded = new TextEncoder().encode('{"name": "test"')
			expect(() => decodeJson(encoded)).toThrow()
		})

		it('should throw error for incomplete JSON array', () => {
			const encoded = new TextEncoder().encode('[1, 2, 3')
			expect(() => decodeJson(encoded)).toThrow()
		})

		it('should throw error for empty byte array', () => {
			const encoded = new Uint8Array()
			expect(() => decodeJson(encoded)).toThrow()
		})

		it('should throw error for malformed JSON with trailing comma', () => {
			const encoded = new TextEncoder().encode('{"name": "test",}')
			expect(() => decodeJson(encoded)).toThrow()
		})

		it('should throw error for unquoted keys', () => {
			const encoded = new TextEncoder().encode('{name: "test"}')
			expect(() => decodeJson(encoded)).toThrow()
		})

		it('should throw error for single quotes instead of double quotes', () => {
			const encoded = new TextEncoder().encode("{'name': 'test'}")
			expect(() => decodeJson(encoded)).toThrow()
		})
	})

	describe('edge cases', () => {
		it('should handle JSON with whitespace', () => {
			const input = { name: 'test' }
			const encoded = new TextEncoder().encode('  \n  {"name": "test"}  \n  ')
			expect(decodeJson(encoded)).toEqual(input)
		})

		it('should handle JSON with zero values', () => {
			const input = { zero: 0, empty: '', falsy: false }
			const encoded = new TextEncoder().encode(JSON.stringify(input))
			expect(decodeJson(encoded)).toEqual(input)
		})

		it('should handle deeply nested JSON', () => {
			const input = {
				level1: {
					level2: {
						level3: {
							level4: {
								level5: {
									value: 'deep',
								},
							},
						},
					},
				},
			}
			const encoded = new TextEncoder().encode(JSON.stringify(input))
			expect(decodeJson(encoded)).toEqual(input)
		})

		it('should handle large arrays', () => {
			const input = Array.from({ length: 1000 }, (_, i) => i)
			const encoded = new TextEncoder().encode(JSON.stringify(input))
			expect(decodeJson(encoded)).toEqual(input)
		})

		it('should handle JSON with null values in objects', () => {
			const input = { value: null, nested: { inner: null } }
			const encoded = new TextEncoder().encode(JSON.stringify(input))
			expect(decodeJson(encoded)).toEqual(input)
		})
	})
})
