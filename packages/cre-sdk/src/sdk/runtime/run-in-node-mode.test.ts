import { describe, expect, mock, test } from 'bun:test'
import { create } from '@bufbuild/protobuf'
import {
	AggregationType,
	ConsensusDescriptorSchema,
	type Mode,
	type SimpleConsensusInputs,
	type SimpleConsensusInputsJson,
} from '@cre/generated/sdk/v1alpha/sdk_pb'
import type { Value as ProtoValue } from '@cre/generated/values/v1/values_pb'
import { BasicActionCapability } from '@cre/generated-sdk/capabilities/internal/basicaction/v1/basicaction_sdk_gen'
import { ConsensusCapability } from '@cre/generated-sdk/capabilities/internal/consensus/v1alpha/consensus_sdk_gen'
import { runInNodeMode } from '@cre/sdk/runtime/run-in-node-mode'
import type { NodeRuntime } from '@cre/sdk/runtime/runtime'
// Mock the host bindings before importing runtime
import { calls } from '@cre/sdk/testhelpers/mock-host-bindings'
import { consensusIdenticalAggregation, consensusMedianAggregation, Value } from '../utils'

function expectObservation(i: SimpleConsensusInputs): Value {
	expect(i.observation.case).toEqual('value')
	return Value.wrap(i.observation.value as ProtoValue)
}

function expectError(i: SimpleConsensusInputs): string {
	expect(i.observation.case).toEqual('error')
	return i.observation.value as string
}

describe('runInNodeMode', () => {
	test('successful run', async () => {
		// Clear the calls array for this test
		calls.length = 0

		const anyObservation = 120
		const anyResult = 123

		// spy on consensus.simple
		const origSimple = ConsensusCapability.prototype.simple
		ConsensusCapability.prototype.simple = mock(
			(inputs: SimpleConsensusInputs | SimpleConsensusInputsJson) => {
				calls.push('CONSENSUS_SIMPLE')

				// biome-ignore lint/suspicious/noExplicitAny: Needed for runtime type checking of protocol buffer messages
				expect((inputs as any).$typeName).toBeDefined()
				const castedInputs = inputs as SimpleConsensusInputs
				expect(castedInputs.default).toBeUndefined()
				const actualObservation = expectObservation(castedInputs)
				expect(Value.from(anyObservation)).toEqual(actualObservation)

				const expectedDescriptor = create(ConsensusDescriptorSchema, {
					descriptor: {
						case: 'aggregation',
						value: AggregationType.MEDIAN,
					},
				})
				expect(castedInputs.descriptors).toEqual(expectedDescriptor)

				return { result: async () => Value.from(anyResult).proto() }
			},
		)

		const res = await runInNodeMode(
			(_: NodeRuntime) => anyObservation,
			consensusMedianAggregation(),
		)()
		expect(res).toEqual(anyResult)

		expect(calls).toEqual(['NODE', 'DON', 'CONSENSUS_SIMPLE'])

		// Restore the original method after the test
		ConsensusCapability.prototype.simple = origSimple
	})

	test('local failure with consensus', async () => {
		// Clear the calls array for this test
		calls.length = 0

		const anyError = Error('nope')
		const anyResult = 123

		// spy on consensus.simple
		const origSimple = ConsensusCapability.prototype.simple
		ConsensusCapability.prototype.simple = mock(
			(inputs: SimpleConsensusInputs | SimpleConsensusInputsJson) => {
				calls.push('CONSENSUS_SIMPLE')

				// biome-ignore lint/suspicious/noExplicitAny: Needed for runtime type checking of protocol buffer messages
				expect((inputs as any).$typeName).toBeDefined()
				const castedInputs = inputs as SimpleConsensusInputs
				expect(castedInputs.default).toBeUndefined()
				const actualError = expectError(castedInputs)
				expect(anyError.message).toEqual(actualError)

				const expectedDescriptor = create(ConsensusDescriptorSchema, {
					descriptor: {
						case: 'aggregation',
						value: AggregationType.MEDIAN,
					},
				})
				expect(castedInputs.descriptors).toEqual(expectedDescriptor)

				return { result: async () => Value.from(anyResult).proto() }
			},
		)

		const errFn: (_: NodeRuntime) => number = (_: NodeRuntime) => {
			throw anyError
		}
		const res = await runInNodeMode(errFn, consensusMedianAggregation())()
		expect(res).toEqual(anyResult)

		expect(calls).toEqual(['NODE', 'DON', 'CONSENSUS_SIMPLE'])

		// Restore the original method after the test
		ConsensusCapability.prototype.simple = origSimple
	})

	test('guards DON calls while in node mode, also local and consensus failure', async () => {
		// Simulate switchModes by touching global function used by host
		const origSwitch = (globalThis as any).switchModes
		;(globalThis as any).switchModes = (_m: Mode) => {}

		// spy on consensus.simple
		const origSimple = ConsensusCapability.prototype.simple
		ConsensusCapability.prototype.simple = mock(
			(inputs: SimpleConsensusInputs | SimpleConsensusInputsJson) => {
				calls.push('CONSENSUS_SIMPLE')

				// biome-ignore lint/suspicious/noExplicitAny: Needed for runtime type checking of protocol buffer messages
				expect((inputs as any).$typeName).toBeDefined()
				const castedInputs = inputs as SimpleConsensusInputs
				expect(castedInputs.default).toBeUndefined()
				const actualError = expectError(castedInputs)
				expect(actualError).toContain('cannot use Runtime inside RunInNodeMode.')

				const expectedDescriptor = create(ConsensusDescriptorSchema, {
					descriptor: {
						case: 'aggregation',
						value: AggregationType.IDENTICAL,
					},
				})
				expect(castedInputs.descriptors).toEqual(expectedDescriptor)

				throw Error(actualError)
			},
		)

		expect(async () => {
			await runInNodeMode(async (_: NodeRuntime) => {
				const ba = new BasicActionCapability()
				const result = await ba.performAction({ inputThing: true }).result()
				return result.adaptedThing
			}, consensusIdenticalAggregation())()
		}).toThrow(/.*cannot use Runtime inside RunInNodeMode.*/)

		// Restore the original method and global after the test
		ConsensusCapability.prototype.simple = origSimple
		;(globalThis as any).switchModes = origSwitch
	})
})
