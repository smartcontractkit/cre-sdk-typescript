import { describe, expect, test } from 'bun:test'
import type { ClientCapability } from '@cre/generated-sdk/capabilities/networking/confidentialhttp/v1alpha/client_sdk_gen'
import { httpRequest, normalizeConfidentialHttpRequestInput } from './confidential-http-helpers'

describe('httpRequest', () => {
	test('coerces string body to bodyString', () => {
		const r = httpRequest({ url: 'https://x', method: 'POST', body: 'hello' })
		expect(r.bodyString).toBe('hello')
		expect(r.bodyBytes).toBeUndefined()
	})

	test('coerces Uint8Array body to base64-encoded bodyBytes', () => {
		const bytes = new Uint8Array([0xde, 0xad, 0xbe, 0xef])
		const r = httpRequest({ url: 'https://x', method: 'POST', body: bytes })
		expect(r.bodyBytes).toBe('3q2+7w==')
		expect(r.bodyString).toBeUndefined()
	})

	test('coerces object body to JSON-stringified bodyString', () => {
		const r = httpRequest({
			url: 'https://x',
			method: 'POST',
			body: { hello: 'world', n: 42 },
		})
		expect(r.bodyString).toBe('{"hello":"world","n":42}')
		expect(r.bodyBytes).toBeUndefined()
	})

	test('passes bodyString through verbatim', () => {
		const r = httpRequest({ url: 'https://x', bodyString: '{"already":"json"}' })
		expect(r.bodyString).toBe('{"already":"json"}')
		expect(r.bodyBytes).toBeUndefined()
	})

	test('encodes bodyBytes Uint8Array to base64', () => {
		const r = httpRequest({
			url: 'https://x',
			bodyBytes: new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
		})
		expect(r.bodyBytes).toBe('3q2+7w==')
		expect(r.bodyString).toBeUndefined()
	})

	test('passes already-base64 bodyBytes string through verbatim', () => {
		const r = httpRequest({ url: 'https://x', bodyBytes: '3q2+7w==' })
		expect(r.bodyBytes).toBe('3q2+7w==')
		expect(r.bodyString).toBeUndefined()
	})

	test('throws when more than one body field is supplied', () => {
		expect(() => httpRequest({ url: 'https://x', body: 'a', bodyString: 'b' })).toThrow(
			/mutually exclusive/,
		)
		expect(() => httpRequest({ url: 'https://x', bodyString: 'a', bodyBytes: 'b' })).toThrow(
			/mutually exclusive/,
		)
		expect(() =>
			httpRequest({
				url: 'https://x',
				body: 'a',
				bodyBytes: new Uint8Array([1]),
			}),
		).toThrow(/mutually exclusive/)
	})

	test('omits body fields when no body provided', () => {
		const r = httpRequest({ url: 'https://x' })
		expect(r.bodyString).toBeUndefined()
		expect(r.bodyBytes).toBeUndefined()
		expect(r.method).toBe('GET')
	})

	test('maps single-value headers into multiHeaders', () => {
		const r = httpRequest({
			url: 'https://x',
			headers: { 'content-type': 'application/json' },
		})
		expect(r.multiHeaders).toEqual({
			'content-type': { values: ['application/json'] },
		})
	})

	test('maps repeated-value headers into multiHeaders', () => {
		const r = httpRequest({
			url: 'https://x',
			headers: { 'set-cookie': ['a=1', 'b=2'] },
		})
		expect(r.multiHeaders).toEqual({
			'set-cookie': { values: ['a=1', 'b=2'] },
		})
	})

	test('passes native multiHeaders shape through', () => {
		const r = httpRequest({
			url: 'https://x',
			multiHeaders: {
				'set-cookie': { values: ['a=1', 'b=2'] },
				'x-trace': { values: ['abc'] },
			},
		})
		expect(r.multiHeaders).toEqual({
			'set-cookie': { values: ['a=1', 'b=2'] },
			'x-trace': { values: ['abc'] },
		})
	})

	test('headers override multiHeaders entries with same name; others retained', () => {
		const r = httpRequest({
			url: 'https://x',
			multiHeaders: {
				'content-type': { values: ['text/plain'] },
				'x-trace': { values: ['abc'] },
			},
			headers: { 'content-type': 'application/json' },
		})
		expect(r.multiHeaders).toEqual({
			'content-type': { values: ['application/json'] },
			'x-trace': { values: ['abc'] },
		})
	})

	test('passes templateValues through to templatePublicValues', () => {
		const r = httpRequest({
			url: 'https://x',
			templateValues: { region: 'us-east' },
		})
		expect(r.templatePublicValues).toEqual({ region: 'us-east' })
	})

	test('passes timeout through verbatim', () => {
		const r = httpRequest({ url: 'https://x', timeout: '30s' })
		expect(r.timeout).toBe('30s')
	})

	test('omits timeout when not supplied', () => {
		const r = httpRequest({ url: 'https://x' })
		expect(r.timeout).toBeUndefined()
	})

	test('sets encryptOutput only when truthy', () => {
		expect(httpRequest({ url: 'x', encryptOutput: true }).encryptOutput).toBe(true)
		expect(httpRequest({ url: 'x' }).encryptOutput).toBeUndefined()
	})
})

describe('normalizeConfidentialHttpRequestInput', () => {
	test('coerces nested request body to bodyString', () => {
		const r = normalizeConfidentialHttpRequestInput({
			request: { url: 'https://x', method: 'POST', body: { hello: 'world' } },
		})
		expect(r.request?.bodyString).toBe('{"hello":"world"}')
		expect(r.request?.bodyBytes).toBeUndefined()
	})

	test('preserves canonical confidential request fields', () => {
		const r = normalizeConfidentialHttpRequestInput({
			vaultDonSecrets: [{ key: 'api-key', namespace: 'main' }],
			request: {
				url: 'https://x',
				bodyString: 'hello',
				multiHeaders: { 'x-test': { values: ['1'] } },
			},
		})
		expect(r.vaultDonSecrets).toEqual([{ key: 'api-key', namespace: 'main' }])
		expect(r.request?.bodyString).toBe('hello')
		expect(r.request?.multiHeaders).toEqual({ 'x-test': { values: ['1'] } })
	})

	test('throws when nested body fields conflict', () => {
		expect(() =>
			normalizeConfidentialHttpRequestInput({
				request: { url: 'https://x', body: 'a', bodyString: 'b' },
			}),
		).toThrow(/mutually exclusive/)
	})

	test('ClientCapability input type accepts body on variables', () => {
		const input = {
			request: { url: 'https://x', method: 'POST', body: { hello: 'world' } },
		}
		const typed: Parameters<ClientCapability['sendRequest']>[1] = input
		expect(typed).toBe(input)
	})
})
