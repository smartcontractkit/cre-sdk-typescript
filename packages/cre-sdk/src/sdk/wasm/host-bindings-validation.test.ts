import { describe, expect, test } from 'bun:test'
import { Mode } from '@cre/generated/sdk/v1alpha/sdk_pb'
import { z } from 'zod'
import { globalHostBindingsSchema } from './host-bindings'

const bindings = () => ({
	switchModes: (_mode: Mode) => undefined,
	setRandomMode: (_mode: Mode) => undefined,
	log: (_message: string) => undefined,
	sendResponse: (_data: Uint8Array) => 1,
	versionV2: () => undefined,
	callCapability: (_data: Uint8Array) => 2,
	awaitCapabilities: (_data: Uint8Array, _length: number) => new Uint8Array([3]),
	getSecrets: (_data: Uint8Array, _length: number) => undefined,
	awaitSecrets: (_data: Uint8Array, _length: number) => new Uint8Array([4]),
	getWasiArgs: () => 'args',
	now: () => 100,
	sleep: (_milliseconds: number) => undefined,
})

describe('host binding validation with Zod 4', () => {
	test('preserves numeric, enum, byte and void calls', () => {
		const host = globalHostBindingsSchema.parse(bindings())
		expect(host.switchModes(Mode.DON)).toBeUndefined()
		expect(host.setRandomMode(Mode.NODE)).toBeUndefined()
		expect(host.sendResponse(new Uint8Array())).toBe(1)
		expect(host.awaitCapabilities(new Uint8Array(), 1)).toEqual(new Uint8Array([3]))
		expect(host.getSecrets(new Uint8Array(), 1)).toBeUndefined()
		expect(host.getWasiArgs()).toBe('args')
		expect(host.now()).toBe(100)
	})

	test('rejects missing or non-callable bindings before invocation', () => {
		expect(() => globalHostBindingsSchema.parse({ ...bindings(), log: undefined })).toThrow(
			z.ZodError,
		)
		expect(() => globalHostBindingsSchema.parse({ ...bindings(), now: 100 })).toThrow(z.ZodError)
	})

	test('validates argument types at invocation', () => {
		const host = globalHostBindingsSchema.parse(bindings())
		expect(() => Reflect.apply(host.log, undefined, [42])).toThrow(z.ZodError)
		expect(() => Reflect.apply(host.switchModes, undefined, [999])).toThrow(z.ZodError)
		expect(() => Reflect.apply(host.sleep, undefined, ['100'])).toThrow(z.ZodError)
	})

	test('validates return values at invocation', () => {
		const host = globalHostBindingsSchema.parse({ ...bindings(), now: () => 'invalid' })
		expect(() => host.now()).toThrow(z.ZodError)
	})

	test('preserves additional arguments and the function receiver', () => {
		const host = globalHostBindingsSchema.parse({
			...bindings(),
			now(this: { value: number }) {
				return this.value
			},
		})
		expect(Reflect.apply(host.now, { value: 123 }, ['extra'])).toBe(123)
		expect(Reflect.apply(host.log, undefined, ['message', 'extra'])).toBeUndefined()
	})

	test('rejects oversized constrained arrays without accumulating per-item issues', () => {
		const result = z.array(z.string()).max(1).safeParse(Array(10_000).fill(null))
		expect(result.success).toBe(false)
		if (!result.success) expect(result.error.issues.length).toBe(1)
	})
})
