/**
 * Verifies that generated capability mocks work with the test framework:
 * mocks self-register when constructed inside test(); per-method handlers decode payload,
 * invoke the user implementation, and encode the response. Tests both "no implementation" error
 * and happy path (callCapability + await path) with typed overrides.
 */
import { test as bunTest, describe, expect } from 'bun:test'
import {
	BasicTestActionMock,
	EvmMock,
	newTestRuntime,
	test,
} from '@chainlink/cre-sdk/test'
import { ClientCapability as EvmClientCapability } from '@cre/generated-sdk/capabilities/blockchain/evm/v1alpha/client_sdk_gen'
import { BasicActionCapability } from '@cre/generated-sdk/capabilities/internal/basicaction/v1/basicaction_sdk_gen'

const MOCK_OUTSIDE_TEST_ERROR =
	"Capability mocks must be used within the CRE test framework's test() method."

const NO_IMPL_PATTERN =
	/PerformAction: no implementation provided; set the mock's performAction property to define the return value/

describe('Generated capability mocks', () => {
	test('invoking capability without setting handler throws clear error', async () => {
		BasicTestActionMock.testInstance() // registers mock; do not set performAction
		const runtime = newTestRuntime()
		const capability = new BasicActionCapability()

		const response = capability.performAction(runtime, { inputThing: true })
		expect(() => response.result()).toThrow(NO_IMPL_PATTERN)
	})

	test('handler receives decoded input exactly as passed at call site', async () => {
		const expectedInputValue = true
		const mock = BasicTestActionMock.testInstance()
		let receivedInputThing: boolean | undefined
		mock.performAction = (input) => {
			receivedInputThing = input.inputThing
			return { adaptedThing: 'test-output' }
		}
		const runtime = newTestRuntime()
		const capability = new BasicActionCapability()

		capability.performAction(runtime, { inputThing: expectedInputValue }).result()

		expect(receivedInputThing).toBeDefined()
		expect(receivedInputThing).toBe(expectedInputValue)
	})

	test('returned output matches handler return value exactly', async () => {
		const expectedOutputValue = 'custom-adapted-result'
		const mock = BasicTestActionMock.testInstance()
		mock.performAction = () => {
			return { adaptedThing: expectedOutputValue }
		}
		const runtime = newTestRuntime()
		const capability = new BasicActionCapability()

		const result = capability.performAction(runtime, { inputThing: false }).result()

		expect(result.adaptedThing).toBe(expectedOutputValue)
	})

	test('both callCapability and awaitCapability paths return identical handler result', async () => {
		const expectedOutput = 'result-from-handler'
		const inputValue = true
		const mock = BasicTestActionMock.testInstance()
		mock.performAction = (input) => {
			expect(input.inputThing).toBe(inputValue)
			return { adaptedThing: expectedOutput }
		}
		const runtime = newTestRuntime()
		const cap = new BasicActionCapability()

		const result1 = cap.performAction(runtime, { inputThing: inputValue }).result()
		expect(result1.adaptedThing).toBe(expectedOutput)

		const result2 = cap.performAction(runtime, { inputThing: inputValue }).result()
		expect(result2.adaptedThing).toBe(expectedOutput)
	})

	test('calling testInstance twice returns same instance', async () => {
		const instance1 = BasicTestActionMock.testInstance()
		const instance2 = BasicTestActionMock.testInstance()
		expect(instance1).toBe(instance2)
	})
})

describe('Tag-aware capability mocks (EVM with chain selectors)', () => {
	test('testInstance with same chain selector returns same instance', async () => {
		const chainSelector = 11155111n // Sepolia
		const instance1 = EvmMock.testInstance(chainSelector)
		const instance2 = EvmMock.testInstance(chainSelector)
		expect(instance1).toBe(instance2)
	})

	test('testInstance with different chain selectors returns different instances', async () => {
		const sepoliaSelector = 11155111n
		const mumbaiSelector = 80001n
		const sepoliaInstance = EvmMock.testInstance(sepoliaSelector)
		const mumbaiInstance = EvmMock.testInstance(mumbaiSelector)
		expect(sepoliaInstance).not.toBe(mumbaiInstance)
	})

	test('different chain selectors register under distinct capability IDs', async () => {
		const sepoliaSelector = 11155111n
		const mumbaiSelector = 80001n

		const sepoliaMock = EvmMock.testInstance(sepoliaSelector)
		const mumbaiMock = EvmMock.testInstance(mumbaiSelector)

		// Use JSON types with base64 strings for bytes
		sepoliaMock.callContract = () => ({ data: 'AQID' }) // base64 for [1, 2, 3]
		mumbaiMock.callContract = () => ({ data: 'BAUG' }) // base64 for [4, 5, 6]

		const runtime = newTestRuntime()
		const sepoliaCapability = new EvmClientCapability(sepoliaSelector)
		const mumbaiCapability = new EvmClientCapability(mumbaiSelector)

		const sepoliaResult = sepoliaCapability
			.callContract(runtime, { call: { to: '', data: '' } })
			.result()
		const mumbaiResult = mumbaiCapability
			.callContract(runtime, { call: { to: '', data: '' } })
			.result()

		expect(sepoliaResult.data).toEqual(new Uint8Array([1, 2, 3]))
		expect(mumbaiResult.data).toEqual(new Uint8Array([4, 5, 6]))
	})
})

bunTest('mock throws when used outside CRE test()', () => {
	expect(() => BasicTestActionMock.testInstance()).toThrow(MOCK_OUTSIDE_TEST_ERROR)
})
