import { describe, expect, test } from 'bun:test'
import type { NoExcess } from './no-excess'

// Compile-time tests. The runtime expects a single passing case so bun:test
// counts the file. The interesting assertions live in @ts-expect-error lines.
describe('NoExcess', () => {
	test('rejects unknown top-level keys', () => {
		type Shape = { url: string; method: string }

		const ok: NoExcess<{ url: string; method: string }, Shape> = {
			url: 'x',
			method: 'POST',
		}
		expect(ok.url).toBe('x')

		const bad: NoExcess<{ url: string; method: string; extra: string }, Shape> = {
			url: 'x',
			method: 'POST',
			// @ts-expect-error 'extra' is not in Shape -> mapped to never
			extra: 'no',
		}
		expect(bad).toBeDefined()
	})

	test('rejects unknown keys in nested objects', () => {
		type HttpReq = { url: string; bodyString?: string }
		type Wrapper = { request: HttpReq }

		const ok: NoExcess<{ request: { url: string; bodyString: string } }, Wrapper> = {
			request: { url: 'x', bodyString: 'hi' },
		}
		expect(ok.request.url).toBe('x')

		const bad: NoExcess<
			{ request: { url: string; body: { hello: string } } },
			Wrapper
			// @ts-expect-error nested 'body' is not in HttpReq -> mapped to never
		> = { request: { url: 'x', body: { hello: 'world' } } }
		expect(bad).toBeDefined()
	})

	test('allows arbitrary keys inside index-signature maps', () => {
		type HeaderValues = { values: string[] }
		type Shape = { multiHeaders: { [k: string]: HeaderValues } }

		const ok: NoExcess<
			{ multiHeaders: { 'x-custom': HeaderValues; anything: HeaderValues } },
			Shape
		> = {
			multiHeaders: {
				'x-custom': { values: ['a'] },
				anything: { values: ['b'] },
			},
		}
		expect(Object.keys(ok.multiHeaders)).toHaveLength(2)
	})
})
