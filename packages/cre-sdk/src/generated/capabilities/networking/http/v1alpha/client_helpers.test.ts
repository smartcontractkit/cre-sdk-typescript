import { describe, expect, test } from 'bun:test'
import { create } from '@bufbuild/protobuf'
import { getHeader, json, ok, text } from './client_helpers'
import { ResponseSchema } from './client_pb'

// Helper function to create a test response
function createTestResponse(
	statusCode: number,
	headers: { [key: string]: string },
	body: Uint8Array,
) {
	return create(ResponseSchema, {
		statusCode,
		headers,
		body,
	})
}

describe('HTTP Response Helpers', () => {
	describe('text()', () => {
		describe('with Response object', () => {
			test('decodes UTF-8 text correctly', () => {
				const response = createTestResponse(200, {}, new TextEncoder().encode('Hello, World!'))
				const result = text(response)
				expect(result).toBe('Hello, World!')
			})

			test('handles empty body', () => {
				const response = createTestResponse(200, {}, new Uint8Array())
				const result = text(response)
				expect(result).toBe('')
			})

			test('handles unicode characters', () => {
				const response = createTestResponse(200, {}, new TextEncoder().encode('Hello 世界! 🌍'))
				const result = text(response)
				expect(result).toBe('Hello 世界! 🌍')
			})

			test('handles binary data as text', () => {
				const binaryData = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]) // "Hello"
				const response = createTestResponse(200, {}, binaryData)
				const result = text(response)
				expect(result).toBe('Hello')
			})
		})

		describe('with function that returns { result: Response }', () => {
			test('decodes UTF-8 text correctly', () => {
				const response = createTestResponse(200, {}, new TextEncoder().encode('Hello, World!'))
				const responseFn = () => ({ result: response })
				const result = text(responseFn)
				expect(result.result()).toBe('Hello, World!')
			})

			test('handles empty body', () => {
				const response = createTestResponse(200, {}, new Uint8Array())
				const responseFn = () => ({ result: response })
				const result = text(responseFn)
				expect(result.result()).toBe('')
			})

			test('handles unicode characters', () => {
				const response = createTestResponse(200, {}, new TextEncoder().encode('Hello 世界! 🌍'))
				const responseFn = () => ({ result: response })
				const result = text(responseFn)
				expect(result.result()).toBe('Hello 世界! 🌍')
			})

			test('handles binary data as text', () => {
				const binaryData = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]) // "Hello"
				const response = createTestResponse(200, {}, binaryData)
				const responseFn = () => ({ result: response })
				const result = text(responseFn)
				expect(result.result()).toBe('Hello')
			})
		})
	})

	describe('json()', () => {
		describe('with Response object', () => {
			test('parses valid JSON object', () => {
				const jsonData = { name: 'John', age: 30, active: true }
				const response = createTestResponse(
					200,
					{},
					new TextEncoder().encode(JSON.stringify(jsonData)),
				)
				const result = json(response)
				expect(result).toEqual(jsonData)
			})

			test('parses valid JSON array', () => {
				const jsonData = [1, 2, 3, 'test', { nested: true }]
				const response = createTestResponse(
					200,
					{},
					new TextEncoder().encode(JSON.stringify(jsonData)),
				)
				const result = json(response)
				expect(result).toEqual(jsonData)
			})

			test('parses JSON string', () => {
				const jsonData = 'Hello, World!'
				const response = createTestResponse(
					200,
					{},
					new TextEncoder().encode(JSON.stringify(jsonData)),
				)
				const result = json(response)
				expect(result).toBe(jsonData)
			})

			test('parses JSON number', () => {
				const jsonData = 42
				const response = createTestResponse(
					200,
					{},
					new TextEncoder().encode(JSON.stringify(jsonData)),
				)
				const result = json(response)
				expect(result).toBe(jsonData)
			})

			test('parses JSON boolean', () => {
				const jsonData = true
				const response = createTestResponse(
					200,
					{},
					new TextEncoder().encode(JSON.stringify(jsonData)),
				)
				const result = json(response)
				expect(result).toBe(jsonData)
			})

			test('parses JSON null', () => {
				const jsonData = null
				const response = createTestResponse(
					200,
					{},
					new TextEncoder().encode(JSON.stringify(jsonData)),
				)
				const result = json(response)
				expect(result).toBe(jsonData)
			})

			test('throws error for invalid JSON', () => {
				const response = createTestResponse(200, {}, new TextEncoder().encode('invalid json {'))
				expect(() => json(response)).toThrow('JSON Parse error')
			})

			test('throws error for empty body', () => {
				const response = createTestResponse(200, {}, new Uint8Array())
				expect(() => json(response)).toThrow('JSON Parse error')
			})

			test('throws error for non-JSON text', () => {
				const response = createTestResponse(200, {}, new TextEncoder().encode('just plain text'))
				expect(() => json(response)).toThrow('JSON Parse error')
			})
		})

		describe('with function that returns { result: Response }', () => {
			test('parses valid JSON object', () => {
				const jsonData = { name: 'John', age: 30, active: true }
				const response = createTestResponse(
					200,
					{},
					new TextEncoder().encode(JSON.stringify(jsonData)),
				)
				const responseFn = () => ({ result: response })
				const result = json(responseFn)
				expect(result.result()).toEqual(jsonData)
			})

			test('parses valid JSON array', () => {
				const jsonData = [1, 2, 3, 'test', { nested: true }]
				const response = createTestResponse(
					200,
					{},
					new TextEncoder().encode(JSON.stringify(jsonData)),
				)
				const responseFn = () => ({ result: response })
				const result = json(responseFn)
				expect(result.result()).toEqual(jsonData)
			})

			test('parses JSON string', () => {
				const jsonData = 'Hello, World!'
				const response = createTestResponse(
					200,
					{},
					new TextEncoder().encode(JSON.stringify(jsonData)),
				)
				const responseFn = () => ({ result: response })
				const result = json(responseFn)
				expect(result.result()).toBe(jsonData)
			})

			test('parses JSON number', () => {
				const jsonData = 42
				const response = createTestResponse(
					200,
					{},
					new TextEncoder().encode(JSON.stringify(jsonData)),
				)
				const responseFn = () => ({ result: response })
				const result = json(responseFn)
				expect(result.result()).toBe(jsonData)
			})

			test('parses JSON boolean', () => {
				const jsonData = true
				const response = createTestResponse(
					200,
					{},
					new TextEncoder().encode(JSON.stringify(jsonData)),
				)
				const responseFn = () => ({ result: response })
				const result = json(responseFn)
				expect(result.result()).toBe(jsonData)
			})

			test('parses JSON null', () => {
				const jsonData = null
				const response = createTestResponse(
					200,
					{},
					new TextEncoder().encode(JSON.stringify(jsonData)),
				)
				const responseFn = () => ({ result: response })
				const result = json(responseFn)
				expect(result.result()).toBe(jsonData)
			})

			test('throws error for invalid JSON', () => {
				const response = createTestResponse(200, {}, new TextEncoder().encode('invalid json {'))
				const responseFn = () => ({ result: response })
				const result = json(responseFn)
				expect(() => result.result()).toThrow('JSON Parse error')
			})

			test('throws error for empty body', () => {
				const response = createTestResponse(200, {}, new Uint8Array())
				const responseFn = () => ({ result: response })
				const result = json(responseFn)
				expect(() => result.result()).toThrow('JSON Parse error')
			})

			test('throws error for non-JSON text', () => {
				const response = createTestResponse(200, {}, new TextEncoder().encode('just plain text'))
				const responseFn = () => ({ result: response })
				const result = json(responseFn)
				expect(() => result.result()).toThrow('JSON Parse error')
			})
		})
	})

	describe('getHeader()', () => {
		describe('with Response object', () => {
			test('returns correct header value', () => {
				const headers = {
					'Content-Type': 'application/json',
					Authorization: 'Bearer token',
				}
				const response = createTestResponse(200, headers, new Uint8Array())
				const result = getHeader(response, 'Content-Type')
				expect(result).toBe('application/json')
			})

			test('is case-insensitive', () => {
				const headers = { 'Content-Type': 'application/json' }
				const response = createTestResponse(200, headers, new Uint8Array())
				const result = getHeader(response, 'content-type')
				expect(result).toBe('application/json')
			})

			test('returns undefined for non-existent header', () => {
				const headers = { 'Content-Type': 'application/json' }
				const response = createTestResponse(200, headers, new Uint8Array())
				const result = getHeader(response, 'Non-Existent')
				expect(result).toBeUndefined()
			})

			test('handles empty headers', () => {
				const response = createTestResponse(200, {}, new Uint8Array())
				const result = getHeader(response, 'Any-Header')
				expect(result).toBeUndefined()
			})

			test('handles mixed case headers', () => {
				const headers = {
					'Content-Type': 'application/json',
					'X-Custom-Header': 'value',
				}
				const response = createTestResponse(200, headers, new Uint8Array())
				const result1 = getHeader(response, 'CONTENT-TYPE')
				const result2 = getHeader(response, 'x-custom-header')
				expect(result1).toBe('application/json')
				expect(result2).toBe('value')
			})
		})

		describe('with function that returns { result: Response }', () => {
			test('returns correct header value', () => {
				const headers = {
					'Content-Type': 'application/json',
					Authorization: 'Bearer token',
				}
				const response = createTestResponse(200, headers, new Uint8Array())
				const responseFn = () => ({ result: response })
				const result = getHeader(responseFn, 'Content-Type')
				expect(result.result()).toBe('application/json')
			})

			test('is case-insensitive', () => {
				const headers = { 'Content-Type': 'application/json' }
				const response = createTestResponse(200, headers, new Uint8Array())
				const responseFn = () => ({ result: response })
				const result = getHeader(responseFn, 'content-type')
				expect(result.result()).toBe('application/json')
			})

			test('returns undefined for non-existent header', () => {
				const headers = { 'Content-Type': 'application/json' }
				const response = createTestResponse(200, headers, new Uint8Array())
				const responseFn = () => ({ result: response })
				const result = getHeader(responseFn, 'Non-Existent')
				expect(result.result()).toBeUndefined()
			})

			test('handles empty headers', () => {
				const response = createTestResponse(200, {}, new Uint8Array())
				const responseFn = () => ({ result: response })
				const result = getHeader(responseFn, 'Any-Header')
				expect(result.result()).toBeUndefined()
			})

			test('handles mixed case headers', () => {
				const headers = {
					'Content-Type': 'application/json',
					'X-Custom-Header': 'value',
				}
				const response = createTestResponse(200, headers, new Uint8Array())
				const responseFn = () => ({ result: response })
				const result1 = getHeader(responseFn, 'CONTENT-TYPE')
				const result2 = getHeader(responseFn, 'x-custom-header')
				expect(result1.result()).toBe('application/json')
				expect(result2.result()).toBe('value')
			})
		})
	})

	describe('ok()', () => {
		describe('with Response object', () => {
			test('returns true for 2xx status codes', () => {
				const statusCodes = [200, 201, 204, 299]
				statusCodes.forEach((statusCode) => {
					const response = createTestResponse(statusCode, {}, new Uint8Array())
					const result = ok(response)
					expect(result).toBe(true)
				})
			})

			test('returns false for non-2xx status codes', () => {
				const statusCodes = [199, 300, 400, 404, 500, 503]
				statusCodes.forEach((statusCode) => {
					const response = createTestResponse(statusCode, {}, new Uint8Array())
					const result = ok(response)
					expect(result).toBe(false)
				})
			})

			test('handles edge cases', () => {
				const response1 = createTestResponse(199, {}, new Uint8Array())
				const response2 = createTestResponse(200, {}, new Uint8Array())
				const response3 = createTestResponse(299, {}, new Uint8Array())
				const response4 = createTestResponse(300, {}, new Uint8Array())

				expect(ok(response1)).toBe(false)
				expect(ok(response2)).toBe(true)
				expect(ok(response3)).toBe(true)
				expect(ok(response4)).toBe(false)
			})
		})

		describe('with function that returns { result: Response }', () => {
			test('returns true for 2xx status codes', () => {
				const statusCodes = [200, 201, 204, 299]
				statusCodes.forEach((statusCode) => {
					const response = createTestResponse(statusCode, {}, new Uint8Array())
					const responseFn = () => ({ result: response })
					const result = ok(responseFn)
					expect(result.result()).toBe(true)
				})
			})

			test('returns false for non-2xx status codes', () => {
				const statusCodes = [199, 300, 400, 404, 500, 503]
				statusCodes.forEach((statusCode) => {
					const response = createTestResponse(statusCode, {}, new Uint8Array())
					const responseFn = () => ({ result: response })
					const result = ok(responseFn)
					expect(result.result()).toBe(false)
				})
			})

			test('handles edge cases', () => {
				const response1 = createTestResponse(199, {}, new Uint8Array())
				const response2 = createTestResponse(200, {}, new Uint8Array())
				const response3 = createTestResponse(299, {}, new Uint8Array())
				const response4 = createTestResponse(300, {}, new Uint8Array())

				const responseFn1 = () => ({ result: response1 })
				const responseFn2 = () => ({ result: response2 })
				const responseFn3 = () => ({ result: response3 })
				const responseFn4 = () => ({ result: response4 })

				expect(ok(responseFn1).result()).toBe(false)
				expect(ok(responseFn2).result()).toBe(true)
				expect(ok(responseFn3).result()).toBe(true)
				expect(ok(responseFn4).result()).toBe(false)
			})
		})
	})

	describe('integration tests', () => {
		test('can chain helper functions', () => {
			const jsonData = { message: 'Hello, World!', count: 42 }
			const response = createTestResponse(
				200,
				{ 'Content-Type': 'application/json' },
				new TextEncoder().encode(JSON.stringify(jsonData)),
			)

			// Test that we can use multiple helpers on the same response
			const textResult = text(response)
			const jsonResult = json(response)
			const isOk = ok(response)
			const contentType = getHeader(response, 'content-type')

			expect(textResult).toBe(JSON.stringify(jsonData))
			expect(jsonResult).toEqual(jsonData)
			expect(isOk).toBe(true)
			expect(contentType).toBe('application/json')
		})

		test('handles real-world HTTP response simulation', () => {
			const apiResponse = {
				success: true,
				data: { id: 1, name: 'Test Item' },
				timestamp: '2024-01-01T00:00:00Z',
			}

			const response = createTestResponse(
				200,
				{
					'Content-Type': 'application/json',
					'Content-Length': '89',
					Server: 'nginx/1.18.0',
				},
				new TextEncoder().encode(JSON.stringify(apiResponse)),
			)

			// Test all helpers work together
			expect(ok(response)).toBe(true)
			expect(getHeader(response, 'content-type')).toBe('application/json')
			expect(getHeader(response, 'server')).toBe('nginx/1.18.0')
			expect(json(response)).toEqual(apiResponse)
			expect(text(response)).toBe(JSON.stringify(apiResponse))
		})
	})
})
