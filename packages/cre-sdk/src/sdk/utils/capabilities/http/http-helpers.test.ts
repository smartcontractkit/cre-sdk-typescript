import { describe, expect, it, mock } from 'bun:test'
import { create } from '@bufbuild/protobuf'
import {
	HeaderValuesSchema as ConfidentialHeaderValuesSchema,
	type HTTPResponse as ConfidentialHTTPResponse,
} from '@cre/generated/capabilities/networking/confidentialhttp/v1alpha/client_pb'
import type {
	RequestJson,
	Response,
} from '@cre/generated/capabilities/networking/http/v1alpha/client_pb'
import {
	AttributedSignatureSchema,
	type ReportResponse,
	ReportResponseSchema,
} from '@cre/generated/sdk/v1alpha/sdk_pb'
import {
	ClientCapability,
	SendRequester,
} from '@cre/generated-sdk/capabilities/networking/http/v1alpha/client_sdk_gen'
import type { NodeRuntime } from '@cre/index'
import { Report } from '@cre/sdk'
import { getHeader, getHeaders, json, ok, text } from './http-helpers'

// Mock Response object for testing
const createMockResponse = (
	statusCode: number,
	body: Uint8Array,
	headers: Record<string, string> = {},
	multiHeaders: Record<string, { values: string[] }> = {},
): Response =>
	({
		$typeName: 'capabilities.networking.http.v1alpha.Response' as const,
		statusCode,
		body,
		headers,
		multiHeaders,
	}) as Response

describe('HTTP Helpers', () => {
	describe('text', () => {
		it('should decode UTF-8 text and trim whitespace (direct response)', () => {
			const response = createMockResponse(200, new TextEncoder().encode('  hello world  '))
			expect(text(response)).toBe('hello world')
		})

		it('should decode UTF-8 text and trim whitespace (function overload)', () => {
			const response = createMockResponse(200, new TextEncoder().encode('  hello world  '))
			const responseFn = () => ({ result: response })
			expect(text(responseFn).result()).toBe('hello world')
		})

		it('should handle empty response', () => {
			const response = createMockResponse(200, new TextEncoder().encode(''))
			expect(text(response)).toBe('')
		})

		it('should handle response with only whitespace', () => {
			const response = createMockResponse(200, new TextEncoder().encode('   \n\t  '))
			expect(text(response)).toBe('')
		})
	})

	describe('json', () => {
		it('should parse valid JSON (direct response)', () => {
			const jsonData = { name: 'test', value: 123 }
			const response = createMockResponse(200, new TextEncoder().encode(JSON.stringify(jsonData)))
			expect(json(response)).toEqual(jsonData)
		})

		it('should parse valid JSON (function overload)', () => {
			const jsonData = { name: 'test', value: 123 }
			const response = createMockResponse(200, new TextEncoder().encode(JSON.stringify(jsonData)))
			const responseFn = () => ({ result: response })
			expect(json(responseFn).result()).toEqual(jsonData)
		})

		it('should throw error for invalid JSON', () => {
			const response = createMockResponse(200, new TextEncoder().encode('invalid json'))
			expect(() => json(response)).toThrow()
		})
	})

	describe('getHeader', () => {
		it('should return header value (case-insensitive) (direct response)', () => {
			const response = createMockResponse(200, new Uint8Array(), {
				'Content-Type': 'application/json',
				Authorization: 'Bearer token',
			})
			expect(getHeader(response, 'content-type')).toBe('application/json')
			expect(getHeader(response, 'CONTENT-TYPE')).toBe('application/json')
			expect(getHeader(response, 'Authorization')).toBe('Bearer token')
		})

		it('should return header value (function overload)', () => {
			const response = createMockResponse(200, new Uint8Array(), {
				'Content-Type': 'application/json',
			})
			const responseFn = () => ({ result: response })
			expect(getHeader(responseFn, 'content-type').result()).toBe('application/json')
		})

		it('should return undefined for missing header', () => {
			const response = createMockResponse(200, new Uint8Array(), {})
			expect(getHeader(response, 'missing-header')).toBeUndefined()
		})

		it('should join multi-header values without dropping later values', () => {
			const response = createMockResponse(
				200,
				new Uint8Array(),
				{ 'Set-Cookie': 'legacy=1' },
				{ 'Set-Cookie': { values: ['a=1', 'b=2'] } },
			)

			expect(getHeader(response, 'set-cookie')).toBe('a=1, b=2')
		})
	})

	describe('getHeaders', () => {
		it('should preserve multi-header value boundaries', () => {
			const response = createMockResponse(
				200,
				new Uint8Array(),
				{},
				{ 'X-Test': { values: ['one', 'two'] } },
			)

			expect(getHeaders(response, 'x-test')).toEqual(['one', 'two'])
		})

		it('should fall back to deprecated single-value headers', () => {
			const response = createMockResponse(200, new Uint8Array(), {
				'Content-Type': 'application/json',
			})

			expect(getHeaders(response, 'content-type')).toEqual(['application/json'])
		})

		it('should support confidential HTTP responses with multiHeaders only', () => {
			const response = {
				$typeName: 'capabilities.networking.confidentialhttp.v1alpha.HTTPResponse',
				statusCode: 200,
				body: new Uint8Array(),
				multiHeaders: {
					'X-Test': create(ConfidentialHeaderValuesSchema, {
						values: ['secret-one', 'secret-two'],
					}),
				},
			} as ConfidentialHTTPResponse

			expect(getHeaders(response, 'x-test')).toEqual(['secret-one', 'secret-two'])
			expect(getHeader(response, 'x-test')).toBe('secret-one, secret-two')
		})
	})

	describe('ok', () => {
		it('should return true for 2xx status codes (direct response)', () => {
			expect(ok(createMockResponse(200, new Uint8Array()))).toBe(true)
			expect(ok(createMockResponse(201, new Uint8Array()))).toBe(true)
			expect(ok(createMockResponse(299, new Uint8Array()))).toBe(true)
		})

		it('should return true for 2xx status codes (function overload)', () => {
			const response = createMockResponse(200, new Uint8Array())
			const responseFn = () => ({ result: response })
			expect(ok(responseFn).result()).toBe(true)
		})

		it('should return false for non-2xx status codes', () => {
			expect(ok(createMockResponse(199, new Uint8Array()))).toBe(false)
			expect(ok(createMockResponse(300, new Uint8Array()))).toBe(false)
			expect(ok(createMockResponse(404, new Uint8Array()))).toBe(false)
			expect(ok(createMockResponse(500, new Uint8Array()))).toBe(false)
		})
	})
})

describe('sendReport extension', () => {
	const anyRequest: RequestJson = {
		body: 'test',
		headers: { a: 'b' },
		method: 'GET',
		url: 'https://example.com',
	}

	const anyResponse = createMockResponse(200, new Uint8Array(), { a: 'b' })

	const anyReportResponse = create(ReportResponseSchema, {
		configDigest: new Uint8Array([1, 2, 3]),
		seqNr: 101n,
		reportContext: new Uint8Array([4, 5, 6]),
		rawReport: new Uint8Array([7, 8, 9]),
		sigs: [
			create(AttributedSignatureSchema, {
				signature: new Uint8Array([10, 11, 12]),
				signerId: 13,
			}),
			create(AttributedSignatureSchema, {
				signature: new Uint8Array([16, 17, 18]),
				signerId: 14,
			}),
		],
	})
	const anyReport = new Report(anyReportResponse)

	//  safe for this test as we don't use the runtime itself
	const anyRuntime = {} as NodeRuntime<unknown>

	const produceReport = (reportResponse: ReportResponse) => {
		expect(reportResponse).toEqual(anyReportResponse)
		return anyRequest
	}

	class ClientCapabilityMock extends ClientCapability {
		// biome-ignore lint/suspicious/noExplicitAny: Test mock needs to override complex overloaded method signatures. Using 'any' bypasses TypeScript's strict overload compatibility checks that would otherwise require redeclaring all overloaded signatures exactly.
		sendRequest(...args: any[]): any {
			expect(2).toEqual(args.length)
			const [runtime, input] = args
			expect(runtime).toBe(anyRuntime)
			expect(input).toBe(anyRequest)
			return { result: () => anyResponse }
		}
	}

	it('ClientCapability should call the transform function and use the result', () => {
		const clientCapability = new ClientCapabilityMock()
		const response = clientCapability.sendReport(anyRuntime, anyReport, produceReport)
		expect(response.result()).toBe(anyResponse)
	})

	it('SendRequester should call the transform function and use the result', () => {
		const sendRequester = new SendRequester(anyRuntime, new ClientCapabilityMock())
		const response = sendRequester.sendReport(anyReport, produceReport)
		expect(response.result()).toBe(anyResponse)
	})
})
