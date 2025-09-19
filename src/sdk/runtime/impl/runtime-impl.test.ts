import { afterEach, describe, expect, mock, test } from 'bun:test'
import { create } from '@bufbuild/protobuf'
import { type Any, anyPack } from '@bufbuild/protobuf/wkt'
import {
	InputSchema,
	type Output,
	OutputSchema as OutputSchema,
} from '@cre/generated/capabilities/internal/actionandtrigger/v1/action_and_trigger_pb'
import {
	InputsSchema,
	OutputsSchema,
} from '@cre/generated/capabilities/internal/basicaction/v1/basic_action_pb'
import {
	type NodeInputs,
	type NodeInputsJson,
	NodeInputsSchema,
	type NodeOutputs,
	NodeOutputsSchema,
} from '@cre/generated/capabilities/internal/nodeaction/v1/node_action_pb'
import {
	AggregationType,
	type AwaitCapabilitiesRequest,
	type AwaitCapabilitiesResponse,
	AwaitCapabilitiesResponseSchema,
	type AwaitSecretsRequest,
	type AwaitSecretsResponse,
	type CapabilityRequest,
	type CapabilityResponse,
	CapabilityResponseSchema,
	ConsensusDescriptorSchema,
	FieldsMapSchema,
	type GetSecretsRequest,
	Mode,
	type SimpleConsensusInputs,
	type SimpleConsensusInputsJson,
} from '@cre/generated/sdk/v1alpha/sdk_pb'
import type { Value as ProtoValue } from '@cre/generated/values/v1/values_pb'
import { BasicCapability } from '@cre/generated-sdk/capabilities/internal/actionandtrigger/v1/basic_sdk_gen'
import { BasicActionCapability } from '@cre/generated-sdk/capabilities/internal/basicaction/v1/basicaction_sdk_gen'
import { ConsensusCapability } from '@cre/generated-sdk/capabilities/internal/consensus/v1alpha/consensus_sdk_gen'
import { BasicActionCapability as NodeActionCapability } from '@cre/generated-sdk/capabilities/internal/nodeaction/v1/basicaction_sdk_gen'
import type { NodeRuntime, Runtime } from '@cre/sdk/cre'
import {
	ConsensusAggregationByFields,
	consensusMedianAggregation,
	median,
	Value,
} from '@cre/sdk/utils'
import { CapabilityError } from '@cre/sdk/utils/capabilities/capability-error'
import { DonModeError, NodeModeError } from '../errors'
import { type RuntimeHelpers, RuntimeImpl } from './runtime-impl'

// Helper function to create a RuntimeHelpers mock with error-throwing defaults
function createRuntimeHelpersMock(overrides: Partial<RuntimeHelpers> = {}): RuntimeHelpers {
	// Create default implementation that throws errors for all methods
	const defaultMock: RuntimeHelpers = {
		call: mock(() => {
			throw new Error('Method not implemented: call')
		}),
		await: mock(() => {
			throw new Error('Method not implemented: await')
		}),
		getSecrets: mock(() => {
			throw new Error('Method not implemented: getSecrets')
		}),
		awaitSecrets: mock(() => {
			throw new Error('Method not implemented: awaitSecrets')
		}),
		switchModes: mock(() => {
			throw new Error('Method not implemented: switchModes')
		}),
		now: mock(() => {
			throw new Error('Method not implemented: now')
		}),
	}

	// Return a merged object with overrides taking precedence
	return { ...defaultMock, ...overrides }
}

const anyMaxSize = 1024 * 1024

// Store original prototypes for manual restoration
const originalConsensusSimple = ConsensusCapability.prototype.simple
const originalNodeActionPerformAction = NodeActionCapability.prototype.performAction

afterEach(() => {
	// Restore all mocks after each test
	mock.restore()
	// Manually restore prototype methods
	ConsensusCapability.prototype.simple = originalConsensusSimple
	NodeActionCapability.prototype.performAction = originalNodeActionPerformAction
})

describe('test runtime', () => {
	describe('test call capability', () => {
		test.skip('runs async - proper async implementation in progress', async () => {
			const anyResult1 = 'ok1'
			const anyResult2 = 'ok2'
			var expectedCall = 1
			var expectedAwait = 2

			const helpers = createRuntimeHelpersMock({
				call: mock((request: CapabilityRequest) => {
					switch (request.callbackId) {
						case 1:
							expect(request.id).toEqual(BasicActionCapability.CAPABILITY_ID)
							expect(request.method).toEqual('PerformAction')
							expect(1).toEqual(expectedCall)
							expectedCall++
							return true
						case 2:
							expect(request.id).toEqual(BasicCapability.CAPABILITY_ID)
							expect(request.method).toEqual('Action')
							expect(2).toEqual(expectedCall)
							expectedCall++
							return true
						default:
							throw new Error(`Unexpected call with callbackId: ${request.callbackId}`)
					}
				}),
				await: mock((request: AwaitCapabilitiesRequest) => {
					expect(request.ids.length).toEqual(1)
					var payload: Any
					const id = request.ids[0]
					switch (id) {
						case 1:
							expect(1).toEqual(expectedAwait)
							expectedAwait--
							payload = anyPack(OutputsSchema, create(OutputsSchema, { adaptedThing: anyResult1 }))
							break
						case 2:
							expect(2).toEqual(expectedAwait)
							expectedAwait--
							payload = anyPack(OutputSchema, create(OutputSchema, { welcome: anyResult2 }))
							break
						default:
							throw new Error(`Unexpected await with id: ${request.ids[0]}`)
					}
					return create(AwaitCapabilitiesResponseSchema, {
						responses: {
							[id]: create(CapabilityResponseSchema, {
								response: { case: 'payload', value: payload },
							}),
						},
					})
				}),
			})

			const runtime = new RuntimeImpl<any>({}, 1, helpers, anyMaxSize)
			const workflowAction1 = new BasicActionCapability()
			const call1 = workflowAction1.performAction(
				runtime,
				create(InputsSchema, { inputThing: true }),
			)
			const workflowAction2 = new BasicCapability()
			const call2 = workflowAction2.action(runtime, create(InputSchema, { name: 'input' }))
			const result2 = await call2
			expect(result2.welcome).toEqual(anyResult2)
			const result1 = await call1
			expect(result1.adaptedThing).toEqual(anyResult1)
		})

		test('call capability errors', async () => {
			const helpers = createRuntimeHelpersMock({
				call: mock((_: CapabilityRequest) => {
					return false
				}),
			})

			const runtime = new RuntimeImpl<any>({}, 1, helpers, anyMaxSize)
			const workflowAction1 = new BasicActionCapability()
			const call1 = workflowAction1.performAction(
				runtime,
				create(InputsSchema, { inputThing: true }),
			)

			expect(call1).rejects.toThrow(
				new CapabilityError(`Capability not found ${BasicActionCapability.CAPABILITY_ID}`, {
					callbackId: 1,
					capabilityId: BasicActionCapability.CAPABILITY_ID,
					method: 'PerformAction',
				}),
			)
		})

		test('capability errors are returned to the caller', async () => {
			const anyError = 'error'
			const helpers = createRuntimeHelpersMock({
				call: mock((_: CapabilityRequest) => {
					return true
				}),
				await: mock((request: AwaitCapabilitiesRequest) => {
					expect(request.ids.length).toEqual(1)
					return create(AwaitCapabilitiesResponseSchema, {
						responses: {
							[request.ids[0]]: create(CapabilityResponseSchema, {
								response: { case: 'error', value: anyError },
							}),
						},
					})
				}),
			})

			const runtime = new RuntimeImpl<any>({}, 1, helpers, anyMaxSize)
			const workflowAction1 = new BasicActionCapability()
			const call1 = workflowAction1.performAction(
				runtime,
				create(InputsSchema, { inputThing: true }),
			)

			expect(call1).rejects.toThrow(
				new CapabilityError('Error ' + anyError, {
					callbackId: 1,
					capabilityId: BasicActionCapability.CAPABILITY_ID,
					method: 'PerformAction',
				}),
			)
		})

		test('await errors', async () => {
			const anyError = 'error'
			const helpers = createRuntimeHelpersMock({
				call: mock((_: CapabilityRequest) => {
					return true
				}),
				await: mock((_: AwaitCapabilitiesRequest) => {
					throw new Error(anyError)
				}),
			})

			const runtime = new RuntimeImpl<any>({}, 1, helpers, anyMaxSize)
			const workflowAction1 = new BasicActionCapability()
			const call1 = workflowAction1.performAction(
				runtime,
				create(InputsSchema, { inputThing: true }),
			)

			expect(call1).rejects.toThrow(
				new CapabilityError(anyError, {
					callbackId: 1,
					capabilityId: BasicActionCapability.CAPABILITY_ID,
					method: 'PerformAction',
				}),
			)
		})

		test('await missing response', async () => {
			const helpers = createRuntimeHelpersMock({
				call: mock((_: CapabilityRequest) => {
					return true
				}),
				await: mock((_: AwaitCapabilitiesRequest) => {
					return create(AwaitCapabilitiesResponseSchema, { responses: {} })
				}),
			})

			const runtime = new RuntimeImpl<any>({}, 1, helpers, anyMaxSize)
			const workflowAction1 = new BasicActionCapability()
			const call1 = workflowAction1.performAction(
				runtime,
				create(InputsSchema, { inputThing: true }),
			)

			expect(call1).rejects.toThrow(
				new CapabilityError('No response found for callback ID 1', {
					callbackId: 1,
					capabilityId: BasicActionCapability.CAPABILITY_ID,
					method: 'PerformAction',
				}),
			)
		})
	})
})

describe('test now conversts to date', () => {
	test('now converts to date', () => {
		const helpers = createRuntimeHelpersMock({
			now: mock(() => 1716153600000),
		})

		const runtime = new RuntimeImpl<any>({}, 1, helpers, anyMaxSize)
		const now = runtime.now()
		expect(now).toEqual(new Date(1716153600000 / 1000000))
	})
})

describe('test run in node mode', () => {
	test('successful consensus', async () => {
		const anyObservation = 10
		const anyMedian = 11
		const modes: Mode[] = []
		const helpers = createRuntimeHelpersMock({
			switchModes: mock((mode: Mode) => {
				modes.push(mode)
			}),
		})

		ConsensusCapability.prototype.simple = mock(
			(_: Runtime<any>, inputs: SimpleConsensusInputs | SimpleConsensusInputsJson) => {
				expect(modes).toEqual([Mode.NODE, Mode.DON])
				expect(inputs.default).toBeUndefined()
				const consensusDescriptor = create(ConsensusDescriptorSchema, {
					descriptor: {
						case: 'fieldsMap',
						value: create(FieldsMapSchema, {
							fields: {
								outputThing: create(ConsensusDescriptorSchema, {
									descriptor: { case: 'aggregation', value: AggregationType.MEDIAN },
								}),
							},
						}),
					},
				})
				expect(inputs.descriptors).toEqual(consensusDescriptor)
				expect((inputs as any).$typeName).not.toBeUndefined()
				const inputsProto = inputs as SimpleConsensusInputs
				expect(inputsProto.observation.case).toEqual('value')
				expect(
					Value.wrap(inputsProto.observation.value as ProtoValue).unwrapToType({
						factory: () => create(NodeOutputsSchema),
					}).outputThing,
				).toEqual(anyObservation)
				return Promise.resolve(
					Value.from(create(NodeOutputsSchema, { outputThing: anyMedian })).proto(),
				)
			},
		)

		NodeActionCapability.prototype.performAction = mock(
			(_: NodeRuntime<any>, __: NodeInputs | NodeInputsJson) => {
				expect(modes).toEqual([Mode.NODE])
				return Promise.resolve(create(NodeOutputsSchema, { outputThing: anyObservation }))
			},
		)

		const runtime = new RuntimeImpl<any>({}, 1, helpers, anyMaxSize)
		const result = await runtime.runInNodeMode(
			async (nodeRuntime: NodeRuntime<any>) => {
				const capability = new NodeActionCapability()
				return await capability.performAction(
					nodeRuntime,
					create(NodeInputsSchema, { inputThing: true }),
				)
			},
			ConsensusAggregationByFields<NodeOutputs>({ outputThing: median }),
		)()

		expect(result.outputThing).toEqual(anyMedian)
	})

	test('failed consensus', async () => {
		const anyError = 'error'
		const helpers = createRuntimeHelpersMock({
			switchModes: mock((_: Mode) => {}),
		})

		ConsensusCapability.prototype.simple = mock(
			(_: Runtime<any>, inputs: SimpleConsensusInputs | SimpleConsensusInputsJson) => {
				expect(inputs.default).toBeUndefined()
				expect(inputs.descriptors).toEqual(
					create(ConsensusDescriptorSchema, {
						descriptor: { case: 'aggregation', value: AggregationType.MEDIAN },
					}),
				)
				expect((inputs as any).$typeName).not.toBeUndefined()
				const inputsProto = inputs as SimpleConsensusInputs
				expect(inputsProto.observation.case).toEqual('error')
				expect(inputsProto.observation.value).toEqual(anyError)
				return Promise.reject(new Error(anyError))
			},
		)

		const runtime = new RuntimeImpl<any>({}, 1, helpers, anyMaxSize)
		const result = runtime.runInNodeMode(async (nodeRuntime: NodeRuntime<any>) => {
			throw new Error(anyError)
		}, consensusMedianAggregation())()
		expect(result).rejects.toThrow(new Error(anyError))
	})

	test('node runtime in don mode fails', async () => {
		const helpers = createRuntimeHelpersMock({
			switchModes: mock((_: Mode) => {}),
			call: mock((_: CapabilityRequest) => {
				expect(false).toBe(true)
				return false
			}),
		})

		ConsensusCapability.prototype.simple = mock(
			(_: Runtime<any>, __: SimpleConsensusInputs | SimpleConsensusInputsJson) => {
				return Promise.resolve(Value.from(0).proto())
			},
		)

		const runtime = new RuntimeImpl<any>({}, 1, helpers, anyMaxSize)
		var nrt: NodeRuntime<any> | undefined
		await runtime.runInNodeMode(async (nodeRuntime: NodeRuntime<any>) => {
			nrt = nodeRuntime
			return 0
		}, consensusMedianAggregation())()

		const capability = new NodeActionCapability()
		expect(nrt).toBeDefined()
		expect(
			capability.performAction(nrt!, create(NodeInputsSchema, { inputThing: true })),
		).rejects.toThrow(new NodeModeError())
	})

	test('don runtime in node mode fails', async () => {
		const helpers = createRuntimeHelpersMock({
			switchModes: mock((_: Mode) => {}),
		})

		ConsensusCapability.prototype.simple = mock(
			(_: Runtime<any>, inputs: SimpleConsensusInputs | SimpleConsensusInputsJson) => {
				expect(inputs.default).toBeUndefined()
				expect(inputs.descriptors).toEqual(
					create(ConsensusDescriptorSchema, {
						descriptor: { case: 'aggregation', value: AggregationType.MEDIAN },
					}),
				)
				expect((inputs as any).$typeName).not.toBeUndefined()
				const inputsProto = inputs as SimpleConsensusInputs
				expect(inputsProto.observation.case).toEqual('error')
				expect(inputsProto.observation.value).toEqual(new DonModeError().message)
				return Promise.reject(new DonModeError())
			},
		)

		const runtime = new RuntimeImpl<any>({}, 1, helpers, anyMaxSize)
		const result = runtime.runInNodeMode(async (_: NodeRuntime<any>) => {
			const capability = new BasicActionCapability()
			await capability.performAction(runtime, create(InputsSchema, { inputThing: true }))
			return 0
		}, consensusMedianAggregation())()
		expect(result).rejects.toThrow(new DonModeError())
	})
})

/*

func TestRuntime_Rand(t *testing.T) {
	t.Run("random delegates", func(t *testing.T) {
		runtime := testutils.NewRuntime(t, map[string]string{})
		runtime.SetRandomSource(rand.NewSource(1))
		r, err := runtime.Rand()
		require.NoError(t, err)
		result := r.Uint64()
		assert.Equal(t, rand.New(rand.NewSource(1)).Uint64(), result)
	})

	t.Run("random does not allow use in the wrong mode", func(t *testing.T) {
		test := func(config string, rt cre.Runtime, _ *basictrigger.Outputs) (uint64, error) {
			return cre.RunInNodeMode(config, rt, func(string, cre.NodeRuntime) (uint64, error) {
				if _, err := rt.Rand(); err != nil {
					return 0, err
				}

				return 0, fmt.Errorf("should not be called in node mode")
			}, cre.ConsensusMedianAggregation[uint64]()).Await()
		}

		_, err := testRuntime(t, test)
		require.Error(t, err)
	})

	t.Run("returned random panics if you use it in the wrong mode ", func(t *testing.T) {
		assert.Panics(t, func() {
			test := func(config string, rt cre.Runtime, _ *basictrigger.Outputs) (uint64, error) {
				r, err := rt.Rand()
				if err != nil {
					return 0, err
				}
				return cre.RunInNodeMode(config, rt, func(_ string, _ cre.NodeRuntime) (uint64, error) {
					r.Uint64()
					return 0, fmt.Errorf("should not be called in node mode")
				}, cre.ConsensusMedianAggregation[uint64]()).Await()
			}

			_, _ = testRuntime(t, test)
		})
	})
}
	*/
