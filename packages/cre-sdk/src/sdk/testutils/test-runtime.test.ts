/**
 * Tests for the test-runtime helper layer only. Covers Registry (via test()),
 * createTestRuntimeHelpers, default consensus handler, and TestRuntime getLogs/setTimeProvider.
 * Does not re-test RuntimeImpl behaviour covered in runtime-impl.test.ts.
 */
import { test as bunTest, describe, expect } from 'bun:test'
import { create } from '@bufbuild/protobuf'
import { AnySchema } from '@bufbuild/protobuf/wkt'
import { BasicActionCapability } from '@cre/generated-sdk/capabilities/internal/basicaction/v1/basicaction_sdk_gen'
import { consensusMedianAggregation } from '@cre/sdk/utils'
import { CapabilityError } from '@cre/sdk/utils/capabilities/capability-error'
import { SecretsError } from '../errors'
import { BasicActionCapabilityMock } from '../test/generated/capabilities/internal/basicaction/v1/basicaction_mock_gen'
import {
	__testOnlyRegistryStore,
	__testOnlyRunWithRegistry,
	getTestCapabilityHandler,
	newTestRuntime,
	REPORT_METADATA_HEADER_LENGTH,
	RESPONSE_BUFFER_TOO_SMALL,
	registerTestCapability,
	test,
} from './test-runtime'

describe('Registry (via test)', () => {
	test('get returns undefined for unregistered id', async () => {
		expect(getTestCapabilityHandler('missing')).toBeUndefined()
	})

	test('register and get return handler', async () => {
		const handler = () => ({
			response: { case: 'error' as const, value: 'x' },
		})
		registerTestCapability('my-cap', handler)
		expect(getTestCapabilityHandler('my-cap')).toBe(handler)
	})

	test('register throws when id already exists', async () => {
		registerTestCapability('dup', () => ({
			response: { case: 'error' as const, value: '' },
		}))
		expect(() =>
			registerTestCapability('dup', () => ({
				response: { case: 'error' as const, value: '' },
			})),
		).toThrow('capability already exists: dup')
	})
})

describe('TestRuntime / helper layer', () => {
	test('getLogs returns messages written via helper log()', () => {
		const rt = newTestRuntime()
		rt.log('msg1')
		rt.log('msg2')
		expect(rt.getLogs()).toEqual(['msg1', 'msg2'])
	})

	test('now() uses Date.now() when setTimeProvider not set', () => {
		const rt = newTestRuntime()
		const before = Date.now()
		const t = rt.now().getTime()
		const after = Date.now()
		expect(t).toBeGreaterThanOrEqual(before)
		expect(t).toBeLessThanOrEqual(after)
	})

	test('setTimeProvider causes helper now() to return provided value', () => {
		const rt = newTestRuntime()
		const fixed = 999888777666
		rt.setTimeProvider(() => fixed)
		expect(rt.now().getTime()).toBe(fixed)
	})

	test('helper call returns false for unregistered capability', () => {
		const rt = newTestRuntime()
		const cap = new BasicActionCapability()
		const call = cap.performAction(rt, { inputThing: true })
		expect(() => call.result()).toThrow(CapabilityError)
		expect(() => call.result()).toThrow(/Capability not found/)
	})

	test('registered capability: callCapability and await path both route to handler and return result', () => {
		const expectedResult = 'result-from-registered-handler'
		const mock = BasicActionCapabilityMock.testInstance()
		mock.performAction = () => ({ adaptedThing: expectedResult })
		const rt = newTestRuntime()

		// Sync path: callCapability (via performAction) then .result() triggers internal await
		const call1 = new BasicActionCapability().performAction(rt, {
			inputThing: true,
		})
		expect(call1.result().adaptedThing).toBe(expectedResult)

		// Async path: two in-flight calls, then both .result() — helper routes by callbackId
		const call2 = new BasicActionCapability().performAction(rt, {
			inputThing: false,
		})
		const call3 = new BasicActionCapability().performAction(rt, {
			inputThing: true,
		})
		expect(call2.result().adaptedThing).toBe(expectedResult)
		expect(call3.result().adaptedThing).toBe(expectedResult)
	})

	test('helper call catches handler throw and await returns error response', () => {
		const rt = newTestRuntime()
		const errMsg = 'node function error'
		const p = rt.runInNodeMode(() => {
			throw new Error(errMsg)
		}, consensusMedianAggregation())()
		expect(() => p.result()).toThrow(errMsg)
	})

	test('helper await throws RESPONSE_BUFFER_TOO_SMALL when serialized response exceeds maxResponseSize', () => {
		const rt = newTestRuntime(null, { maxResponseSize: 1 })
		const payload = new Uint8Array(new ArrayBuffer(3))
		payload.set([1, 2, 3])
		const reportCall = rt.report({
			encodedPayload: Buffer.from(payload).toString('base64'),
		})
		expect(() => reportCall.result()).toThrow(RESPONSE_BUFFER_TOO_SMALL)
	})

	test('default Report handler: defaultReport metadata + payload + sigs', () => {
		const rt = newTestRuntime()
		const payloadBytes = new TextEncoder().encode('some_encoded_report_data')
		const payload = new Uint8Array(new ArrayBuffer(payloadBytes.length))
		payload.set(payloadBytes)
		const result = rt.report({ encodedPayload: Buffer.from(payload).toString('base64') }).result()
		const unwrapped = result.x_generatedCodeOnly_unwrap()
		expect(unwrapped.rawReport.length).toBe(REPORT_METADATA_HEADER_LENGTH + payload.length)
		const expectedMetadata = new Uint8Array(REPORT_METADATA_HEADER_LENGTH)
		for (let i = 0; i < REPORT_METADATA_HEADER_LENGTH; i++) {
			expectedMetadata[i] = i % 256
		}
		expect(unwrapped.rawReport.slice(0, REPORT_METADATA_HEADER_LENGTH)).toEqual(expectedMetadata)
		expect(unwrapped.rawReport.slice(REPORT_METADATA_HEADER_LENGTH)).toEqual(payload)
		expect(unwrapped.sigs).toHaveLength(2)
		expect(new TextDecoder().decode(unwrapped.sigs[0].signature)).toBe('default_signature_1')
		expect(new TextDecoder().decode(unwrapped.sigs[1].signature)).toBe('default_signature_2')
	})

	test('default Simple handler: observation value branch returns value', () => {
		const rt = newTestRuntime()
		const p = rt.runInNodeMode(() => 42, consensusMedianAggregation())()
		expect(p.result()).toBe(42)
	})

	test('default Simple handler: observation error with default returns default', () => {
		const rt = newTestRuntime()
		const p = rt.runInNodeMode(() => {
			throw new Error('fail')
		}, consensusMedianAggregation<number>().withDefault(100))()
		expect(p.result()).toBe(100)
	})

	test('default Simple handler: observation error without default throws', () => {
		const rt = newTestRuntime()
		const p = rt.runInNodeMode(() => {
			throw new Error('no default')
		}, consensusMedianAggregation())()
		expect(() => p.result()).toThrow('no default')
	})

	test('default consensus handler returns error for unknown method', async () => {
		newTestRuntime() // registers consensus handler on current registry
		const handler = getTestCapabilityHandler('consensus@1.0.0-alpha')
		if (!handler) throw new Error('expected handler')
		const res = handler({
			id: 'consensus@1.0.0-alpha',
			method: 'Other',
			payload: create(AnySchema, { value: new Uint8Array(0) }),
		})
		expect(res.response.case).toBe('error')
		if (res.response.case === 'error') {
			expect(res.response.value).toBe('unknown method Other')
		}
	})

	test('helper getSecrets: secret found returns value', () => {
		const secrets = new Map<string, Map<string, string>>()
		secrets.set('ns1', new Map([['id1', 'val1']]))
		const rt = newTestRuntime(secrets)
		const result = rt.getSecret({ id: 'id1', namespace: 'ns1' }).result()
		expect(result.value).toBe('val1')
		expect(result.id).toBe('id1')
		expect(result.namespace).toBe('ns1')
	})

	test('helper getSecrets: secret not found returns error response', () => {
		const rt = newTestRuntime()
		expect(() => rt.getSecret({ id: 'missing', namespace: 'ns' }).result()).toThrow(SecretsError)
	})

	test('newTestRuntime uses options.maxResponseSize', () => {
		const rt = newTestRuntime(null, { maxResponseSize: 1 })
		const payload = new Uint8Array(new ArrayBuffer(2))
		payload.set([1, 2])
		expect(() =>
			rt.report({ encodedPayload: Buffer.from(payload).toString('base64') }).result(),
		).toThrow(RESPONSE_BUFFER_TOO_SMALL)
	})

	test('newTestRuntime with null/undefined secrets uses empty map', () => {
		const rt = newTestRuntime(null)
		expect(() => rt.getSecret({ id: 'x', namespace: 'y' }).result()).toThrow(SecretsError)
		const rt2 = newTestRuntime()
		expect(rt2.getLogs()).toEqual([])
	})
})

describe('test wrapper', () => {
	test('registry is available inside test body (set/read without passing registry)', async () => {
		registerTestCapability('cap-a', () => ({
			response: { case: 'error' as const, value: 'a' },
		}))
		const handler = getTestCapabilityHandler('cap-a')
		if (!handler) throw new Error('expected handler')
		expect(
			handler({
				id: 'cap-a',
				method: 'M',
				payload: create(AnySchema, { value: new Uint8Array(0) }),
			}).response,
		).toEqual({
			case: 'error',
			value: 'a',
		})
	})

	test('isolation: test A registers only-a', async () => {
		registerTestCapability('only-a', () => ({
			response: { case: 'error' as const, value: 'a' },
		}))
		expect(getTestCapabilityHandler('only-a')).toBeDefined()
	})

	test('isolation: test B does not see test A registry', async () => {
		expect(getTestCapabilityHandler('only-a')).toBeUndefined()
	})

	bunTest('cleanup: after test finishes, store is undefined', async () => {
		await __testOnlyRunWithRegistry(async () => {
			expect(__testOnlyRegistryStore()).toBeDefined()
		})
		expect(__testOnlyRegistryStore()).toBeUndefined()
	})

	bunTest('failure path: cleanup happens when test body throws', async () => {
		await expect(
			__testOnlyRunWithRegistry(async () => {
				expect(__testOnlyRegistryStore()).toBeDefined()
				throw new Error('intentional failure')
			}),
		).rejects.toThrow('intentional failure')
		expect(__testOnlyRegistryStore()).toBeUndefined()
	})
})
