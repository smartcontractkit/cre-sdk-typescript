import { afterEach, describe, expect, test } from 'bun:test'
import { z } from 'zod'
import { createExtensionAccessor } from './validate-extension'

const greetSchema = z.object({
	greet: z.function().args().returns(z.string()),
})

describe('createExtensionAccessor', () => {
	afterEach(() => {
		for (const key of ['testExt', 'cachedExt']) {
			delete (globalThis as Record<string, unknown>)[key]
		}
	})

	test('returns validated extension from globalThis', () => {
		;(globalThis as Record<string, unknown>).testExt = { greet: () => 'hello' }

		const accessor = createExtensionAccessor('testExt', greetSchema)
		expect(accessor().greet()).toBe('hello')
	})

	test('caches the validated result across calls', () => {
		;(globalThis as Record<string, unknown>).cachedExt = { greet: () => 'cached' }

		const accessor = createExtensionAccessor('cachedExt', greetSchema)
		const first = accessor()
		const second = accessor()
		expect(first).toBe(second)
	})

	test('throws when extension is missing from globalThis', () => {
		const accessor = createExtensionAccessor('nonExistent', greetSchema)

		expect(() => accessor()).toThrow(/"nonExistent" was not found on globalThis/)
		expect(() => accessor()).toThrow(/must be provided by the nonExistent plugin/)
		expect(() => accessor()).toThrow(/--plugin/)
		expect(() => accessor()).toThrow(/--cre-exports/)
	})

	test('throws when extension exists but fails schema validation', () => {
		;(globalThis as Record<string, unknown>).testExt = { wrong: 'shape' }

		const accessor = createExtensionAccessor('testExt', greetSchema)

		expect(() => accessor()).toThrow(/"testExt" failed validation/)
		expect(() => accessor()).toThrow(/must be provided by the testExt plugin/)
	})
})
