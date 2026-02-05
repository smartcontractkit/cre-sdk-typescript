import { afterEach, describe, expect, mock, test } from 'bun:test'
import { create, type MessageInitShape } from '@bufbuild/protobuf'
import { type Any, anyPack, anyUnpack } from '@bufbuild/protobuf/wkt'
import {
	InputSchema,
	OutputSchema,
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
	AwaitCapabilitiesResponseSchema,
	AwaitSecretsResponseSchema,
	type CapabilityRequest,
	CapabilityResponseSchema,
	ConsensusDescriptorSchema,
	FieldsMapSchema,
	Mode,
	SecretRequestSchema,
	SecretResponseSchema,
	SecretResponsesSchema,
	type SimpleConsensusInputs,
	SimpleConsensusInputsSchema,
} from '@cre/generated/sdk/v1alpha/sdk_pb'
import type { Value as ProtoValue } from '@cre/generated/values/v1/values_pb'
import { BasicCapability } from '@cre/generated-sdk/capabilities/internal/actionandtrigger/v1/basic_sdk_gen'
import { BasicActionCapability } from '@cre/generated-sdk/capabilities/internal/basicaction/v1/basicaction_sdk_gen'
import { ConsensusCapability } from '@cre/generated-sdk/capabilities/internal/consensus/v1alpha/consensus_sdk_gen'
import { BasicActionCapability as NodeActionCapability } from '@cre/generated-sdk/capabilities/internal/nodeaction/v1/basicaction_sdk_gen'
import type { NodeRuntime, Runtime } from '@cre/sdk/cre'
import {
	ConsensusAggregationByFields,
	ConsensusFieldAggregation,
	consensusMedianAggregation,
	identical,
	ignore,
	median,
	Value,
} from '@cre/sdk/utils'
import { CapabilityError } from '@cre/sdk/utils/capabilities/capability-error'
import { DonModeError, NodeModeError, SecretsError } from '../errors'
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
		// switchModes is used in every test, most will ignore it, so it's safe to default to a no-op.
		switchModes: mock(() => {}),
		now: mock(() => {
			throw new Error('Method not implemented: now')
		}),
		log: mock(() => {}),
	}

	// Return a merged object with overrides taking precedence
	return { ...defaultMock, ...overrides }
}

const anyMaxSize = 1024n * 1024n

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
		test('allows awaiting multiple capability results in different order than calls', () => {
			const anyResult1 = 'ok1'
			const anyResult2 = 'ok2'
			var expectedCall = 1
			var expectedAwait = 2

			const input1 = create(InputsSchema, { inputThing: true })
			const input2 = create(InputSchema, { name: 'input' })

			const helpers = createRuntimeHelpersMock({
				call: mock((request: CapabilityRequest) => {
					switch (request.callbackId) {
						case 1:
							expect(expectedCall).toEqual(1)
							expectedCall++
							expect(request.id).toEqual(BasicActionCapability.CAPABILITY_ID)
							expect(request.method).toEqual('PerformAction')
							expect(anyUnpack(request.payload as Any, InputsSchema)).toEqual(input1)
							return true
						case 2:
							expect(expectedCall).toEqual(2)
							expectedCall++
							expect(request.id).toEqual(BasicCapability.CAPABILITY_ID)
							expect(request.method).toEqual('Action')
							expect(anyUnpack(request.payload as Any, InputSchema)).toEqual(input2)
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

			const runtime = new RuntimeImpl<unknown>({}, 1, helpers, anyMaxSize)
			const workflowAction1 = new BasicActionCapability()
			const call1 = workflowAction1.performAction(runtime, input1)
			const workflowAction2 = new BasicCapability()
			const call2 = workflowAction2.action(runtime, input2)
			const result2 = call2.result()
			expect(result2.welcome).toEqual(anyResult2)
			const result1 = call1.result()
			expect(result1.adaptedThing).toEqual(anyResult1)
		})

		test('call capability errors', () => {
			const helpers = createRuntimeHelpersMock({
				call: mock((_: CapabilityRequest) => {
					return false
				}),
			})

			const runtime = new RuntimeImpl<unknown>({}, 1, helpers, anyMaxSize)
			const workflowAction1 = new BasicActionCapability()
			const call1 = workflowAction1.performAction(
				runtime,
				create(InputsSchema, { inputThing: true }),
			)

			expect(() => call1.result()).toThrow(
				new CapabilityError(`Capability not found ${BasicActionCapability.CAPABILITY_ID}`, {
					callbackId: 1,
					capabilityId: BasicActionCapability.CAPABILITY_ID,
					method: 'PerformAction',
				}),
			)
		})

		test('capability errors are returned to the caller', () => {
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

			const runtime = new RuntimeImpl<unknown>({}, 1, helpers, anyMaxSize)
			const workflowAction1 = new BasicActionCapability()
			const call1 = workflowAction1.performAction(
				runtime,
				create(InputsSchema, { inputThing: true }),
			)

			expect(() => call1.result()).toThrow(
				new CapabilityError(`Error ${anyError}`, {
					callbackId: 1,
					capabilityId: BasicActionCapability.CAPABILITY_ID,
					method: 'PerformAction',
				}),
			)
		})

		test('await errors', () => {
			const anyError = 'error'
			const helpers = createRuntimeHelpersMock({
				call: mock((_: CapabilityRequest) => {
					return true
				}),
				await: mock((_: AwaitCapabilitiesRequest) => {
					throw new Error(anyError)
				}),
			})

			const runtime = new RuntimeImpl<unknown>({}, 1, helpers, anyMaxSize)
			const workflowAction1 = new BasicActionCapability()
			const call1 = workflowAction1.performAction(
				runtime,
				create(InputsSchema, { inputThing: true }),
			)

			expect(() => call1.result()).toThrow(
				new CapabilityError(anyError, {
					callbackId: 1,
					capabilityId: BasicActionCapability.CAPABILITY_ID,
					method: 'PerformAction',
				}),
			)
		})

		test('await missing response', () => {
			const helpers = createRuntimeHelpersMock({
				call: mock((_: CapabilityRequest) => {
					return true
				}),
				await: mock((_: AwaitCapabilitiesRequest) => {
					return create(AwaitCapabilitiesResponseSchema, { responses: {} })
				}),
			})

			const runtime = new RuntimeImpl<unknown>({}, 1, helpers, anyMaxSize)
			const workflowAction1 = new BasicActionCapability()
			const call1 = workflowAction1.performAction(
				runtime,
				create(InputsSchema, { inputThing: true }),
			)

			expect(() => call1.result()).toThrow(
				new CapabilityError('No response found for callback ID 1', {
					callbackId: 1,
					capabilityId: BasicActionCapability.CAPABILITY_ID,
					method: 'PerformAction',
				}),
			)
		})
	})
})

describe('test now converts to date', () => {
	test('now converts to date', () => {
		const helpers = createRuntimeHelpersMock({
			now: mock(() => 1716153600000),
		})

		const runtime = new RuntimeImpl<unknown>({}, 1, helpers, anyMaxSize)
		const now = runtime.now()
		expect(now).toEqual(new Date(1716153600000))
	})
})

describe('test getSecret', () => {
	test('successfully gets secret with SecretRequest (proto message)', () => {
		const secretRequest = create(SecretRequestSchema, {
			id: 'my-secret',
			namespace: 'test-ns',
		})

		const helpers = createRuntimeHelpersMock({
			getSecrets: mock((request) => {
				expect(request.callbackId).toEqual(1)
				expect(request.requests.length).toEqual(1)
				return true
			}),
			awaitSecrets: mock((request) => {
				expect(request.ids.length).toEqual(1)
				expect(request.ids[0]).toEqual(1)
				return create(AwaitSecretsResponseSchema, {
					responses: {
						1: create(SecretResponsesSchema, {
							responses: [
								create(SecretResponseSchema, {
									response: {
										case: 'secret',
										value: {
											id: 'my-secret',
											namespace: 'test-ns',
											owner: 'test-owner',
											value: 'secret-value-123',
										},
									},
								}),
							],
						}),
					},
				})
			}),
		})

		const runtime = new RuntimeImpl<unknown>({}, 1, helpers, anyMaxSize)
		const result = runtime.getSecret(secretRequest).result()
		expect(result.id).toEqual('my-secret')
		expect(result.namespace).toEqual('test-ns')
		expect(result.value).toEqual('secret-value-123')
	})

	test('successfully gets secret with SecretRequestJson (plain JSON)', () => {
		const secretRequestJson = { id: 'another-secret', namespace: 'another-ns' }

		const helpers = createRuntimeHelpersMock({
			getSecrets: mock((request) => {
				expect(request.callbackId).toEqual(1)
				expect(request.requests.length).toEqual(1)
				return true
			}),
			awaitSecrets: mock((request) => {
				expect(request.ids.length).toEqual(1)
				expect(request.ids[0]).toEqual(1)
				return create(AwaitSecretsResponseSchema, {
					responses: {
						1: create(SecretResponsesSchema, {
							responses: [
								create(SecretResponseSchema, {
									response: {
										case: 'secret',
										value: {
											id: 'another-secret',
											namespace: 'another-ns',
											owner: 'another-owner',
											value: 'value-456',
										},
									},
								}),
							],
						}),
					},
				})
			}),
		})

		const runtime = new RuntimeImpl<unknown>({}, 1, helpers, anyMaxSize)
		const result = runtime.getSecret(secretRequestJson).result()
		expect(result.id).toEqual('another-secret')
		expect(result.namespace).toEqual('another-ns')
		expect(result.value).toEqual('value-456')
	})

	test('getSecrets returns false', () => {
		const secretRequest = create(SecretRequestSchema, {
			id: 'test-secret',
			namespace: 'test-ns',
		})

		const helpers = createRuntimeHelpersMock({
			getSecrets: mock(() => false),
		})

		const runtime = new RuntimeImpl<unknown>({}, 1, helpers, anyMaxSize)
		expect(() => runtime.getSecret(secretRequest).result()).toThrow(
			new SecretsError(secretRequest, 'host is not making the secrets request'),
		)
	})

	test('awaitSecrets returns no response for callback ID', () => {
		const secretRequest = create(SecretRequestSchema, {
			id: 'test-secret',
			namespace: 'test-ns',
		})

		const helpers = createRuntimeHelpersMock({
			getSecrets: mock(() => true),
			awaitSecrets: mock(() => {
				return create(AwaitSecretsResponseSchema, {
					responses: {},
				})
			}),
		})

		const runtime = new RuntimeImpl<unknown>({}, 1, helpers, anyMaxSize)
		expect(() => runtime.getSecret(secretRequest).result()).toThrow(
			new SecretsError(secretRequest, 'no response'),
		)
	})

	test('awaitSecrets returns invalid number of responses', () => {
		const secretRequest = create(SecretRequestSchema, {
			id: 'test-secret',
			namespace: 'test-ns',
		})

		const helpers = createRuntimeHelpersMock({
			getSecrets: mock(() => true),
			awaitSecrets: mock(() => {
				return create(AwaitSecretsResponseSchema, {
					responses: {
						1: create(SecretResponsesSchema, {
							responses: [],
						}),
					},
				})
			}),
		})

		const runtime = new RuntimeImpl<unknown>({}, 1, helpers, anyMaxSize)
		expect(() => runtime.getSecret(secretRequest).result()).toThrow(
			new SecretsError(secretRequest, 'invalid value returned from host'),
		)
	})

	test('awaitSecrets returns too many responses', () => {
		const secretRequest = create(SecretRequestSchema, {
			id: 'test-secret',
			namespace: 'test-ns',
		})
		const secretValue = {
			id: 'secret1',
			namespace: 'test-ns',
			owner: 'test-owner',
			value: 'value1',
		}

		const helpers = createRuntimeHelpersMock({
			getSecrets: mock(() => true),
			awaitSecrets: mock(() => {
				return create(AwaitSecretsResponseSchema, {
					responses: {
						1: create(SecretResponsesSchema, {
							responses: [
								create(SecretResponseSchema, {
									response: { case: 'secret', value: secretValue },
								}),
								create(SecretResponseSchema, {
									response: { case: 'secret', value: secretValue },
								}),
							],
						}),
					},
				})
			}),
		})

		const runtime = new RuntimeImpl<unknown>({}, 1, helpers, anyMaxSize)
		expect(() => runtime.getSecret(secretRequest).result()).toThrow(
			new SecretsError(secretRequest, 'invalid value returned from host'),
		)
	})

	test('awaitSecrets returns error response', () => {
		const secretRequest = create(SecretRequestSchema, {
			id: 'test-secret',
			namespace: 'test-ns',
		})
		const errorMessage = 'secret not found'

		const helpers = createRuntimeHelpersMock({
			getSecrets: mock(() => true),
			awaitSecrets: mock(() => {
				return create(AwaitSecretsResponseSchema, {
					responses: {
						1: create(SecretResponsesSchema, {
							responses: [
								create(SecretResponseSchema, {
									response: { case: 'error', value: { error: errorMessage } },
								}),
							],
						}),
					},
				})
			}),
		})

		const runtime = new RuntimeImpl<unknown>({}, 1, helpers, anyMaxSize)
		expect(() => runtime.getSecret(secretRequest).result()).toThrow(
			new SecretsError(secretRequest, errorMessage),
		)
	})

	test('awaitSecrets returns unknown response case', () => {
		const secretRequest = create(SecretRequestSchema, {
			id: 'test-secret',
			namespace: 'test-ns',
		})

		const helpers = createRuntimeHelpersMock({
			getSecrets: mock(() => true),
			awaitSecrets: mock(() => {
				return create(AwaitSecretsResponseSchema, {
					responses: {
						1: create(SecretResponsesSchema, {
							responses: [
								create(SecretResponseSchema, {
									response: { case: undefined },
								}),
							],
						}),
					},
				})
			}),
		})

		const runtime = new RuntimeImpl<unknown>({}, 1, helpers, anyMaxSize)
		expect(() => runtime.getSecret(secretRequest).result()).toThrow(
			new SecretsError(secretRequest, 'cannot unmarshal returned value from host'),
		)
	})

	test('getSecret increments callback ID correctly', () => {
		const callbackIds: number[] = []
		const secretValue = {
			id: 'secret',
			namespace: 'test-ns',
			owner: 'test-owner',
			value: 'value',
		}

		const helpers = createRuntimeHelpersMock({
			getSecrets: mock((request) => {
				callbackIds.push(request.callbackId)
				return true
			}),
			awaitSecrets: mock((request) => {
				const id = request.ids[0]
				return create(AwaitSecretsResponseSchema, {
					responses: {
						[id]: create(SecretResponsesSchema, {
							responses: [
								create(SecretResponseSchema, {
									response: { case: 'secret', value: secretValue },
								}),
							],
						}),
					},
				})
			}),
		})

		const runtime = new RuntimeImpl<unknown>({}, 1, helpers, anyMaxSize)

		runtime.getSecret({ id: 'secret1', namespace: 'ns1' }).result()
		runtime.getSecret({ id: 'secret2', namespace: 'ns2' }).result()
		runtime.getSecret({ id: 'secret3', namespace: 'ns3' }).result()

		expect(callbackIds).toEqual([1, 2, 3])
	})

	test('getSecret in node mode throws DonModeError', () => {
		const helpers = createRuntimeHelpersMock()

		ConsensusCapability.prototype.simple = mock(() => {
			return { result: () => Value.from(0).proto() }
		})

		const runtime = new RuntimeImpl<unknown>({}, 1, helpers, anyMaxSize)
		let capturedError: Error | undefined

		runtime.runInNodeMode((_nodeRuntime: NodeRuntime<unknown>) => {
			// Try to call getSecret from within node mode (should fail)
			try {
				runtime.getSecret({ id: 'test', namespace: 'test-ns' }).result()
			} catch (e) {
				capturedError = e as Error
			}
			return 0
		}, consensusMedianAggregation())()

		expect(capturedError).toBeDefined()
		expect(capturedError).toBeInstanceOf(DonModeError)
	})
})

describe('test run in node mode', () => {
	test('successful consensus', () => {
		const anyObservation = 10
		const anyMedian = 11
		const modes: Mode[] = []
		const helpers = createRuntimeHelpersMock({
			switchModes: mock((mode: Mode) => {
				modes.push(mode)
			}),
		})

		ConsensusCapability.prototype.simple = mock(
			(
				_: Runtime<unknown>,
				inputs: SimpleConsensusInputs | MessageInitShape<typeof SimpleConsensusInputsSchema>,
			) => {
				expect(modes).toEqual([Mode.DON, Mode.NODE, Mode.DON])
				expect(inputs.default).toBeUndefined()
				const consensusDescriptor = create(ConsensusDescriptorSchema, {
					descriptor: {
						case: 'fieldsMap',
						value: create(FieldsMapSchema, {
							fields: {
								outputThing: create(ConsensusDescriptorSchema, {
									descriptor: {
										case: 'aggregation',
										value: AggregationType.MEDIAN,
									},
								}),
							},
						}),
					},
				})
				expect(inputs.descriptors).toEqual(consensusDescriptor)
				expect((inputs as { $typeName?: string }).$typeName).not.toBeUndefined()
				const inputsProto = inputs as SimpleConsensusInputs
				expect(inputsProto.observation.case).toEqual('value')
				expect(
					Value.wrap(inputsProto.observation.value as ProtoValue).unwrapToType({
						factory: () => create(NodeOutputsSchema),
					}).outputThing,
				).toEqual(anyObservation)
				return {
					result: () => Value.from(create(NodeOutputsSchema, { outputThing: anyMedian })).proto(),
				}
			},
		)

		// Create a mock that handles both overloads properly
		const performActionMock = function (this: NodeActionCapability, ...args: unknown[]): unknown {
			// Check if this is the sugar syntax overload (has function parameter)
			if (typeof args[0] === 'function') {
				// This test doesn't expect sugar syntax to be used
				throw new Error('Sugar syntax should not be used in this test')
			}
			// Otherwise, this is the basic call overload
			const [_, __] = args as [NodeRuntime<unknown>, NodeInputs | NodeInputsJson]
			expect(modes).toEqual([Mode.DON, Mode.NODE])
			return {
				result: () => create(NodeOutputsSchema, { outputThing: anyObservation }),
			}
		}

		// Apply the mock with proper typing
		// biome-ignore lint/suspicious/noExplicitAny: Mock assignment requires any due to overloaded function signature
		;(NodeActionCapability.prototype as any).performAction = mock(performActionMock)

		const runtime = new RuntimeImpl<unknown>({}, 1, helpers, anyMaxSize)
		const result = runtime
			.runInNodeMode(
				(nodeRuntime: NodeRuntime<unknown>) => {
					const capability = new NodeActionCapability()
					return capability
						.performAction(nodeRuntime, create(NodeInputsSchema, { inputThing: true }))
						.result()
				},
				ConsensusAggregationByFields<NodeOutputs>({ outputThing: median }),
			)()
			.result()

		expect(result.outputThing).toEqual(anyMedian)
	})

	test('failed consensus', () => {
		const anyError = 'error'
		const helpers = createRuntimeHelpersMock({
			switchModes: mock((_: Mode) => {}),
		})

		ConsensusCapability.prototype.simple = mock(
			(
				_: Runtime<unknown>,
				inputs: SimpleConsensusInputs | MessageInitShape<typeof SimpleConsensusInputsSchema>,
			) => {
				expect(inputs.default).toBeUndefined()
				expect(inputs.descriptors).toEqual(
					create(ConsensusDescriptorSchema, {
						descriptor: { case: 'aggregation', value: AggregationType.MEDIAN },
					}),
				)
				expect((inputs as { $typeName?: string }).$typeName).not.toBeUndefined()
				const inputsProto = inputs as SimpleConsensusInputs
				expect(inputsProto.observation.case).toEqual('error')
				expect(inputsProto.observation.value).toEqual(anyError)
				return {
					result: () => {
						throw new Error(anyError)
					},
				}
			},
		)

		const runtime = new RuntimeImpl<unknown>({}, 1, helpers, anyMaxSize)
		const result = runtime.runInNodeMode((_: NodeRuntime<unknown>) => {
			throw new Error(anyError)
		}, consensusMedianAggregation())()
		expect(() => result.result()).toThrow(new Error(anyError))
	})

	test('node runtime in don mode fails', () => {
		const helpers = createRuntimeHelpersMock({
			switchModes: mock((_: Mode) => {}),
			call: mock((_: CapabilityRequest) => {
				expect(false).toBe(true)
				return false
			}),
		})

		ConsensusCapability.prototype.simple = mock(
			(
				_: Runtime<unknown>,
				__: SimpleConsensusInputs | MessageInitShape<typeof SimpleConsensusInputsSchema>,
			) => {
				return { result: () => Value.from(0).proto() }
			},
		)

		const runtime = new RuntimeImpl<unknown>({}, 1, helpers, anyMaxSize)
		var nrt: NodeRuntime<unknown> | undefined
		runtime.runInNodeMode((nodeRuntime: NodeRuntime<unknown>) => {
			nrt = nodeRuntime
			return 0
		}, consensusMedianAggregation())()

		const capability = new NodeActionCapability()
		expect(nrt).toBeDefined()
		expect(() =>
			capability
				.performAction(nrt as NodeRuntime<unknown>, create(NodeInputsSchema, { inputThing: true }))
				.result(),
		).toThrow(new NodeModeError())
	})

	test('don runtime in node mode fails', () => {
		const helpers = createRuntimeHelpersMock({
			switchModes: mock((_: Mode) => {}),
		})

		ConsensusCapability.prototype.simple = mock(
			(
				_: Runtime<unknown>,
				inputs: SimpleConsensusInputs | MessageInitShape<typeof SimpleConsensusInputsSchema>,
			) => {
				expect(inputs.default).toBeUndefined()
				expect(inputs.descriptors).toEqual(
					create(ConsensusDescriptorSchema, {
						descriptor: { case: 'aggregation', value: AggregationType.MEDIAN },
					}),
				)
				expect((inputs as { $typeName?: string }).$typeName).not.toBeUndefined()
				const inputsProto = inputs as SimpleConsensusInputs
				expect(inputsProto.observation.case).toEqual('error')
				expect(inputsProto.observation.value).toEqual(new DonModeError().message)
				return {
					result: () => {
						throw new DonModeError()
					},
				}
			},
		)

		const runtime = new RuntimeImpl<unknown>({}, 1, helpers, anyMaxSize)
		const result = runtime.runInNodeMode((_: NodeRuntime<unknown>) => {
			const capability = new BasicActionCapability()
			capability.performAction(runtime, create(InputsSchema, { inputThing: true })).result()
			return 0
		}, consensusMedianAggregation())()
		expect(() => result.result()).toThrow(new DonModeError())
	})

	test('multiple runInNodeMode calls have unique callback IDs', () => {
		const callbackIds: number[] = []
		const helpers = createRuntimeHelpersMock({
			switchModes: mock((_: Mode) => {}),
			call: mock((request: CapabilityRequest) => {
				callbackIds.push(request.callbackId)
				return true
			}),
			await: mock((request: AwaitCapabilitiesRequest) => {
				const id = request.ids[0]
				return create(AwaitCapabilitiesResponseSchema, {
					responses: {
						[id]: create(CapabilityResponseSchema, {
							response: {
								case: 'payload',
								value: anyPack(NodeOutputsSchema, create(NodeOutputsSchema, { outputThing: 42 })),
							},
						}),
					},
				})
			}),
		})

		ConsensusCapability.prototype.simple = mock(
			(
				_: Runtime<unknown>,
				__: SimpleConsensusInputs | MessageInitShape<typeof SimpleConsensusInputsSchema>,
			) => {
				return {
					result: () => Value.from(create(NodeOutputsSchema, { outputThing: 42 })).proto(),
				}
			},
		)

		const runtime = new RuntimeImpl<unknown>({}, 1, helpers, anyMaxSize)

		// First runInNodeMode call with capability inside
		const call1 = runtime.runInNodeMode(
			(nodeRuntime: NodeRuntime<unknown>) => {
				const capability = new NodeActionCapability()
				return capability
					.performAction(nodeRuntime, create(NodeInputsSchema, { inputThing: true }))
					.result()
			},
			ConsensusAggregationByFields<NodeOutputs>({ outputThing: median }),
		)

		call1().result()

		// Second runInNodeMode call with capability inside
		const call2 = runtime.runInNodeMode(
			(nodeRuntime: NodeRuntime<unknown>) => {
				const capability = new NodeActionCapability()
				return capability
					.performAction(nodeRuntime, create(NodeInputsSchema, { inputThing: false }))
					.result()
			},
			ConsensusAggregationByFields<NodeOutputs>({ outputThing: median }),
		)

		call2().result()

		// Verify that we have two distinct callback IDs
		expect(callbackIds.length).toEqual(2)
		expect(callbackIds[0]).toEqual(-1) // First node mode call
		expect(callbackIds[1]).toEqual(-2) // Second node mode call
		// Ensure they are different (no reuse/collision)
		expect(callbackIds[0]).not.toEqual(callbackIds[1])
	})

	test('clears ignored fields from default and response values', () => {
		type NestedStruct = {
			nestedIncluded: string
			nestedIgnored: string
		}

		type TestStruct = {
			includedField: string
			ignoredField: string
			nested: NestedStruct
		}

		const defaultVal: TestStruct = {
			includedField: 'default_included',
			ignoredField: 'default_ignored',
			nested: {
				nestedIncluded: 'default_nested_included',
				nestedIgnored: 'default_nested_ignored',
			},
		}

		const responseVal: TestStruct = {
			includedField: 'response_included',
			ignoredField: 'response_ignored',
			nested: {
				nestedIncluded: 'response_nested_included',
				nestedIgnored: 'response_nested_ignored',
			},
		}

		const helpers = createRuntimeHelpersMock({
			switchModes: mock((_: Mode) => {}),
		})

		ConsensusCapability.prototype.simple = mock(
			(
				_: Runtime<unknown>,
				inputs: SimpleConsensusInputs | MessageInitShape<typeof SimpleConsensusInputsSchema>,
			) => {
				const inputsProto = inputs as SimpleConsensusInputs
				if (inputsProto.observation.case === 'value') {
					const unwrapped = Value.wrap(
						inputsProto.observation.value as ProtoValue,
					).unwrap() as TestStruct
					expect(unwrapped.includedField).toEqual('response_included')
					expect(unwrapped.ignoredField).toBeUndefined()
					expect(unwrapped.nested.nestedIncluded).toEqual('response_nested_included')
					expect(unwrapped.nested.nestedIgnored).toBeUndefined()
					return {
						result: () => inputsProto.observation.value as ProtoValue,
					}
				}
				if (inputsProto.default) {
					const unwrapped = Value.wrap(inputsProto.default as ProtoValue).unwrap() as TestStruct
					expect(unwrapped.includedField).toEqual('default_included')
					expect(unwrapped.ignoredField).toBeUndefined()
					expect(unwrapped.nested.nestedIncluded).toEqual('default_nested_included')
					expect(unwrapped.nested.nestedIgnored).toBeUndefined()
					return {
						result: () => inputsProto.default as ProtoValue,
					}
				}
				if (inputsProto.observation.case === 'error') {
					return {
						result: () => {
							throw new Error(inputsProto.observation.value as string)
						},
					}
				}
				return {
					result: () => {
						throw new Error('unexpected case')
					},
				}
			},
		)

		const runtime = new RuntimeImpl<unknown>({}, 1, helpers, anyMaxSize)

		const nestedAggregation = ConsensusAggregationByFields<NestedStruct>({
			nestedIncluded: identical,
			nestedIgnored: ignore,
		})

		const result = runtime
			.runInNodeMode(
				(_nodeRuntime: NodeRuntime<unknown>) => {
					return responseVal
				},
				ConsensusAggregationByFields<TestStruct>({
					includedField: identical,
					ignoredField: ignore,
					nested: () =>
						new ConsensusFieldAggregation<NestedStruct, true>(nestedAggregation.descriptor),
				}).withDefault(defaultVal),
			)()
			.result()

		expect(result.includedField).toEqual('response_included')
		expect(result.ignoredField).toBeUndefined()
		expect(result.nested.nestedIncluded).toEqual('response_nested_included')
		expect(result.nested.nestedIgnored).toBeUndefined()

		const result2 = runtime
			.runInNodeMode(
				(_nodeRuntime: NodeRuntime<unknown>) => {
					throw new Error('error')
				},
				ConsensusAggregationByFields<TestStruct>({
					includedField: identical,
					ignoredField: ignore,
					nested: () =>
						new ConsensusFieldAggregation<NestedStruct, true>(nestedAggregation.descriptor),
				}).withDefault(defaultVal),
			)()
			.result()

		expect(result2.includedField).toEqual('default_included')
		expect(result2.ignoredField).toBeUndefined()
		expect(result2.nested.nestedIncluded).toEqual('default_nested_included')
		expect(result2.nested.nestedIgnored).toBeUndefined()
	})
})
