import { afterEach, describe, expect, mock, test } from 'bun:test'
import { create, fromBinary, toBinary } from '@bufbuild/protobuf'
import { anyPack, anyUnpack, EmptySchema } from '@bufbuild/protobuf/wkt'
import {
	ConfigSchema,
	OutputsSchema,
} from '@cre/generated/capabilities/internal/basictrigger/v1/basic_trigger_pb'
import {
	AwaitSecretsRequestSchema,
	AwaitSecretsResponseSchema,
	CapabilityRestrictionType,
	type ExecuteRequest,
	ExecuteRequestSchema,
	type ExecutionResult,
	ExecutionResultSchema,
	GetSecretsRequestSchema,
	type Restrictions,
	SecretResponseSchema,
	SecretResponsesSchema,
	SecretSchema,
	type Trigger,
	TriggerSchema,
	type TriggerSubscriptionRequest,
} from '@cre/generated/sdk/v1alpha/sdk_pb'
import type { Value as ProtoValue } from '@cre/generated/values/v1/values_pb'
import { BasicActionRestrictor } from '@cre/generated-sdk/capabilities/internal/basicaction/v1/basicaction_sdk_gen'
import { BasicCapability as BasicTriggerCapability } from '@cre/generated-sdk/capabilities/internal/basictrigger/v1/basic_sdk_gen'
import { cre } from '@cre/sdk/cre'
import { Value } from '../utils'
import type { SecretsProvider } from '../workflow'
import { Runner } from './runner'

const anyConfig = Buffer.from('config')
const anyMaxResponseSize = 2048n
const basicTrigger = new BasicTriggerCapability()
const capID = BasicTriggerCapability.CAPABILITY_ID
const subscribeRequest = create(ExecuteRequestSchema, {
	request: { case: 'subscribe', value: create(EmptySchema) },
	maxResponseSize: anyMaxResponseSize,
	config: anyConfig,
})
const anyExecuteRequest = create(ExecuteRequestSchema, {
	request: {
		case: 'trigger',
		value: create(TriggerSchema, {
			id: 0n,
			payload: anyPack(OutputsSchema, create(OutputsSchema, { coolOutput: 'hi' })),
		}),
	},
	maxResponseSize: anyMaxResponseSize,
	config: anyConfig,
})
const anyPreHookRequest = create(ExecuteRequestSchema, {
	request: {
		case: 'preHook',
		value: create(TriggerSchema, {
			id: 0n,
			payload: anyPack(OutputsSchema, create(OutputsSchema, { coolOutput: 'hi' })),
		}),
	},
	maxResponseSize: anyMaxResponseSize,
	config: anyConfig,
})

type TestRunnerBindings = {
	versionV2: () => void
	sendResponse: (data: Uint8Array) => number
	getWasiArgs: () => string
	getSecrets: (data: Uint8Array | Uint8Array<ArrayBufferLike>, maxresponse: number) => any
	awaitSecrets: (
		data: Uint8Array | Uint8Array<ArrayBufferLike>,
		maxresponse: number,
	) => Uint8Array | Uint8Array<ArrayBufferLike>
}

const mockHostBindings: TestRunnerBindings = {
	sendResponse: mock(() => {
		return 0
	}),
	versionV2: mock(() => {}),
	getWasiArgs: mock(() => {
		throw new Error('override for tests')
	}),
	getSecrets: mock((data, maxResponseSize) => {
		throw new Error('override for tests')
	}),
	awaitSecrets: mock((data, maxResponseSize) => {
		throw new Error('override for tests')
	}),
}

const proxyHostBindings = {
	sendResponse: (data: Uint8Array) => {
		return mockHostBindings.sendResponse(data)
	},
	versionV2: () => {
		return mockHostBindings.versionV2()
	},
	getWasiArgs: () => {
		return mockHostBindings.getWasiArgs()
	},
	switchModes: mock(() => {}),
	log: (message: string) => {
		throw new Error('log called unexpectedly in test')
	},
	callCapability: (data: Uint8Array) => {
		throw new Error('callCapability called unexpectedly in test')
	},
	awaitCapabilities: (data: Uint8Array, id: number) => {
		throw new Error('awaitCapabilities called unexpectedly in test')
	},
	getSecrets: (data: Uint8Array, id: number) => {
		return mockHostBindings.getSecrets(data, id)
	},
	awaitSecrets: (data: Uint8Array, id: number) => {
		return mockHostBindings.awaitSecrets(data, id)
	},
	now: () => {
		throw new Error('now called unexpectedly in test')
	},
}

Object.assign(globalThis, proxyHostBindings)

afterEach(() => {
	mock.restore()
})

describe('runner', () => {
	describe('run', () => {
		test('gathers subscriptions', async () => {
			var sentResponse: ExecutionResult | null = null
			mockHostBindings.sendResponse = mock((input) => {
				sentResponse = fromBinary(ExecutionResultSchema, input)
				return 0
			})
			const runner = await getTestRunner(subscribeRequest)
			await runner.run(async (_: string, secretsProvider: SecretsProvider) => {
				return [
					cre.handler(basicTrigger.trigger({ name: 'foo', number: 10 }), () => {
						throw new Error('Must not be called during registration to tiggers')
					}),
				]
			})
			expect(sentResponse).toBeDefined()
			expect(sentResponse!.result.case).toBe('triggerSubscriptions')
			const responseValue = sentResponse!.result.value! as TriggerSubscriptionRequest
			expect(responseValue.subscriptions.length).toBe(1)
			expect(responseValue.subscriptions[0].id).toBe(capID)
			expect(responseValue.subscriptions[0].method).toBe('Trigger')
			expect(responseValue.subscriptions[0].payload).toBeDefined()
			const actualConfig = anyUnpack(responseValue.subscriptions[0].payload!, ConfigSchema)!
			expect(actualConfig.name).toBe('foo')
			expect(actualConfig.number).toBe(10)
		})

		test('executes workflow', async () => {
			var sentResponse: ExecutionResult | null = null
			mockHostBindings.sendResponse = mock((input) => {
				sentResponse = fromBinary(ExecutionResultSchema, input)
				return 0
			})
			const runner = await getTestRunner(anyExecuteRequest)
			await runner.run(async (_: string, secretsProvider: SecretsProvider) => {
				return [
					cre.handler(basicTrigger.trigger({ name: 'foo', number: 10 }), (runtime, trigger) => {
						expect(runtime.config).toBe(anyConfig.toString())
						expect(trigger.coolOutput).toBe('hi')
						return 10
					}),
				]
			})
			expect(sentResponse).toBeDefined()
			expect(sentResponse!.result.case).toBe('value')
			expect(
				Value.wrap(sentResponse!.result.value as ProtoValue).unwrapToType({
					instance: 10,
				}),
			).toBe(10)
		})
	})

	describe('preHook', () => {
		const actionRestrictor = new BasicActionRestrictor()

		test('returns restrictions from preHook', async () => {
			var sentResponse: ExecutionResult | null = null
			mockHostBindings.sendResponse = mock((input) => {
				sentResponse = fromBinary(ExecutionResultSchema, input)
				return 0
			})

			const runner = await getTestRunner(anyPreHookRequest)
			await runner.run(async (_: string, __: SecretsProvider) => {
				return [
					cre.handler(basicTrigger.trigger({ name: 'foo', number: 10 }), () => 10, {
						preHook: (config, triggerOutput) => {
							expect(config).toBe(anyConfig.toString())
							expect(triggerOutput.coolOutput).toBe('hi')

							return {
								capabilities: {
									restrictions: [actionRestrictor.limitPerformAction(2)],
									maxTotalCalls: 5,
									type: 'CAPABILITY_RESTRICTION_TYPE_CLOSED',
								},
								secrets: {
									restrictions: [
										{
											exactSecret: {
												id: 'db-password',
												namespace: 'infra',
											},
										},
									],
									maxSecrets: 1,
								},
							}
						},
					}),
				]
			})
			expect(sentResponse).toBeDefined()
			const result = sentResponse as unknown as ExecutionResult
			expect(result.result.case).toBe('restrictions')

			const restrictions = result.result.value as Restrictions
			const capabilities = restrictions.capabilities
			expect(capabilities).toBeDefined()
			expect(capabilities?.maxTotalCalls).toBe(5)
			expect(capabilities?.type).toBe(CapabilityRestrictionType.CLOSED)
			expect(capabilities?.restrictions.length).toBe(1)

			const methodRestriction = capabilities?.restrictions[0].restriction
			expect(methodRestriction?.case).toBe('method')
			expect(methodRestriction?.value?.id).toBe('basic-test-action@1.0.0')
			expect(methodRestriction?.value?.method).toBe('PerformAction')
			expect(methodRestriction?.value?.maxCalls).toBe(2)

			const secrets = restrictions.secrets
			expect(secrets).toBeDefined()
			expect(secrets?.maxSecrets).toBe(1)
			expect(secrets?.restrictions.length).toBe(1)

			const secretRestriction = secrets?.restrictions[0].restriction
			expect(secretRestriction?.case).toBe('exactSecret')
			if (secretRestriction?.case === 'exactSecret') {
				expect(secretRestriction.value.id).toBe('db-password')
				expect(secretRestriction.value.namespace).toBe('infra')
			}
		})

		test('returns error when no preHook is registered', async () => {
			var sentResponse: ExecutionResult | null = null
			mockHostBindings.sendResponse = mock((input) => {
				sentResponse = fromBinary(ExecutionResultSchema, input)
				return 0
			})
			const runner = await getTestRunner(anyPreHookRequest)
			await runner.run(async (_: string, __: SecretsProvider) => {
				return [cre.handler(basicTrigger.trigger({ name: 'foo', number: 10 }), () => 10)]
			})
			expect(sentResponse).toBeDefined()
			const result = sentResponse as unknown as ExecutionResult
			expect(result.result.case).toBe('error')
			expect(result.result.value).toContain('no preHook registered')
		})

		test('returns error for out of bounds trigger id', async () => {
			var sentResponse: ExecutionResult | null = null
			mockHostBindings.sendResponse = mock((input) => {
				sentResponse = fromBinary(ExecutionResultSchema, input)
				return 0
			})
			const outOfBoundsRequest = create(ExecuteRequestSchema, {
				request: {
					case: 'preHook',
					value: create(TriggerSchema, {
						id: 99n,
						payload: anyPack(OutputsSchema, create(OutputsSchema, { coolOutput: 'hi' })),
					}),
				},
				maxResponseSize: anyMaxResponseSize,
				config: anyConfig,
			})
			const runner = await getTestRunner(outOfBoundsRequest)
			await runner.run(async (_: string, __: SecretsProvider) => {
				return [
					cre.handler(basicTrigger.trigger({ name: 'foo', number: 10 }), () => 10, {
						preHook: () => ({}),
					}),
				]
			})
			expect(sentResponse).toBeDefined()
			const result = sentResponse as unknown as ExecutionResult
			expect(result.result.case).toBe('error')
			expect(result.result.value).toContain('trigger not found')
		})

		test('returns error when payload is missing', async () => {
			var sentResponse: ExecutionResult | null = null
			mockHostBindings.sendResponse = mock((input) => {
				sentResponse = fromBinary(ExecutionResultSchema, input)
				return 0
			})
			const noPayloadRequest = create(ExecuteRequestSchema, {
				request: {
					case: 'preHook',
					value: create(TriggerSchema, { id: 0n }),
				},
				maxResponseSize: anyMaxResponseSize,
				config: anyConfig,
			})
			const runner = await getTestRunner(noPayloadRequest)
			await runner.run(async (_: string, __: SecretsProvider) => {
				return [
					cre.handler(basicTrigger.trigger({ name: 'foo', number: 10 }), () => 10, {
						preHook: () => ({}),
					}),
				]
			})
			expect(sentResponse).toBeDefined()
			const result = sentResponse as unknown as ExecutionResult
			expect(result.result.case).toBe('error')
			expect(result.result.value).toContain('trigger payload is missing')
		})

		test('selects correct handler with multiple triggers', async () => {
			var sentResponse: ExecutionResult | null = null
			mockHostBindings.sendResponse = mock((input) => {
				sentResponse = fromBinary(ExecutionResultSchema, input)
				return 0
			})
			const secondTriggerRequest = structuredClone(anyPreHookRequest)
			const trigger = secondTriggerRequest.request.value as Trigger
			trigger.id = 1n

			const runner = await getTestRunner(secondTriggerRequest)
			await runner.run(async (_: string, __: SecretsProvider) => {
				return [
					cre.handler(basicTrigger.trigger({ name: 'foo', number: 10 }), () => 10),
					cre.handler(basicTrigger.trigger({ name: 'bar', number: 20 }), () => 20, {
						preHook: (_config, triggerOutput) => {
							expect(triggerOutput.coolOutput).toBe('hi')
							return {
								capabilities: {
									restrictions: [actionRestrictor.limitPerformAction(7)],
									maxTotalCalls: 7,
								},
							}
						},
					}),
				]
			})
			expect(sentResponse).toBeDefined()
			const result = sentResponse as unknown as ExecutionResult
			expect(result.result.case).toBe('restrictions')

			const restrictions = result.result.value as Restrictions
			expect(restrictions.capabilities?.maxTotalCalls).toBe(7)
			expect(restrictions.capabilities?.restrictions[0].restriction.value?.maxCalls).toBe(7)
		})

		test('subscribe reports preHook flag', async () => {
			var sentResponse: ExecutionResult | null = null
			mockHostBindings.sendResponse = mock((input) => {
				sentResponse = fromBinary(ExecutionResultSchema, input)
				return 0
			})
			const runner = await getTestRunner(subscribeRequest)
			await runner.run(async (_: string, __: SecretsProvider) => {
				return [
					cre.handler(basicTrigger.trigger({ name: 'no-hook', number: 1 }), () => 10),
					cre.handler(basicTrigger.trigger({ name: 'with-hook', number: 2 }), () => 20, {
						preHook: () => ({}),
					}),
				]
			})
			expect(sentResponse).toBeDefined()
			const result = sentResponse as unknown as ExecutionResult
			expect(result.result.case).toBe('triggerSubscriptions')
			const responseValue = result.result.value as TriggerSubscriptionRequest
			expect(responseValue.subscriptions.length).toBe(2)
			expect(responseValue.subscriptions[0].preHook).toBe(false)
			expect(responseValue.subscriptions[1].preHook).toBe(true)
		})
	})

	test('executes subscribe error', async () => {
		var sentResponse: ExecutionResult | null = null
		const anyError = 'error'
		mockHostBindings.sendResponse = mock((input) => {
			sentResponse = fromBinary(ExecutionResultSchema, input)
			expect(sentResponse!.result.case).toBe('error')
			expect(sentResponse!.result.value).toBe(anyError)
			return 0
		})
		const runner = await getTestRunner(subscribeRequest)
		await runner.run((_: string, secretsProvider: SecretsProvider) => {
			throw new Error(anyError)
		})
	})

	test('executes subscribe resolve error', async () => {
		var sentResponse: ExecutionResult | null = null
		const anyError = 'error'
		mockHostBindings.sendResponse = mock((input) => {
			sentResponse = fromBinary(ExecutionResultSchema, input)
			expect(sentResponse!.result.case).toBe('error')
			expect(sentResponse!.result.value).toBe(anyError)
			return 0
		})
		const runner = await getTestRunner(subscribeRequest)
		await runner.run(async (_: string, secretsProvider: SecretsProvider) => {
			return Promise.reject(new Error(anyError))
		})
	})

	test('executes trigger error', async () => {
		var sentResponse: ExecutionResult | null = null
		const anyError = 'error'
		mockHostBindings.sendResponse = mock((input) => {
			sentResponse = fromBinary(ExecutionResultSchema, input)
			expect(sentResponse!.result.case).toBe('error')
			expect(sentResponse!.result.value).toBe(anyError)
			return 0
		})
		const runner = await getTestRunner(anyExecuteRequest)
		await runner.run(async (_: string, secretsProvider: SecretsProvider) => {
			throw new Error(anyError)
		})
	})

	test('executes workflow with multiple triggers', async () => {
		var sentResponse: ExecutionResult | null = null
		mockHostBindings.sendResponse = mock((input) => {
			sentResponse = fromBinary(ExecutionResultSchema, input)
			return 0
		})
		const testRequest = structuredClone(anyExecuteRequest)
		const trigger = testRequest.request.value as Trigger
		trigger.id = 1n

		const runner = await getTestRunner(testRequest)
		await runner.run(async (_: string, secretsProvider: SecretsProvider) => {
			return [
				cre.handler(basicTrigger.trigger({ name: 'foo', number: 10 }), (runtime, trigger) => {
					expect(runtime.config).toBe(anyConfig.toString())
					expect(trigger.coolOutput).toBe('hi')
					return 10
				}),
				cre.handler(basicTrigger.trigger({ name: 'bar', number: 20 }), (runtime, trigger) => {
					expect(runtime.config).toBe(anyConfig.toString())
					expect(trigger.coolOutput).toBe('hi')
					return 20
				}),
				cre.handler(basicTrigger.trigger({ name: 'baz', number: 30 }), (runtime, trigger) => {
					expect(runtime.config).toBe(anyConfig.toString())
					expect(trigger.coolOutput).toBe('hi')
					return 30
				}),
			]
		})
		expect(sentResponse).toBeDefined()
		expect(sentResponse!.result.case).toBe('value')
		expect(
			Value.wrap(sentResponse!.result.value as ProtoValue).unwrapToType({
				instance: 10,
			}),
		).toBe(20)
	})

	test('get secrets passes max response size', async () => {
		const anySecretResponse = create(SecretResponseSchema, {
			response: {
				case: 'secret',
				value: create(SecretSchema, {
					id: 'Bar',
					namespace: 'Foo',
					owner: 'Baz',
					value: 'Qux',
				}),
			},
		})
		const anySecretsResponse = create(SecretResponsesSchema, {
			responses: [anySecretResponse],
		})

		mockHostBindings.getSecrets = (data, maxResponseSize) => {
			const dataBytes = Array.isArray(data) ? new Uint8Array(data) : data
			const secretsRequest = fromBinary(GetSecretsRequestSchema, dataBytes)
			expect(secretsRequest.requests.length).toBe(1)
			expect(secretsRequest.requests[0].namespace).toBe('Foo')
			expect(secretsRequest.requests[0].id).toBe('Bar')
			expect(secretsRequest.callbackId).toBe(0)
			expect(maxResponseSize).toBe(Number(anyMaxResponseSize))
			return 0
		}

		mockHostBindings.awaitSecrets = (data, maxResponseSize) => {
			const dataBytes = Array.isArray(data) ? new Uint8Array(data) : data
			const awaitSecretsRequest = fromBinary(AwaitSecretsRequestSchema, dataBytes)
			expect(awaitSecretsRequest.ids.length).toBe(1)
			expect(awaitSecretsRequest.ids[0]).toBe(0)
			expect(maxResponseSize).toBe(Number(anyMaxResponseSize))

			// Create the proper AwaitSecretsResponse with a map
			const awaitSecretsResponse = create(AwaitSecretsResponseSchema, {
				responses: {
					0: anySecretsResponse,
				},
			})
			return toBinary(AwaitSecretsResponseSchema, awaitSecretsResponse)
		}

		const dr = getTestRunner(subscribeRequest)
		await (await dr).run(async (_: string, secretsProvider: SecretsProvider) => {
			const secret = await secretsProvider.getSecret({ namespace: 'Foo', id: 'Bar' }).result()
			expect(secret.namespace).toBe('Foo')
			expect(secret.id).toBe('Bar')
			expect(secret.owner).toBe('Baz')
			expect(secret.value).toBe('Qux')
			return [cre.handler(basicTrigger.trigger({}), () => 10)]
		})
		expect(true).toBe(true)
	})
})

function getTestRunner(request: ExecuteRequest): Promise<Runner<string>> {
	const serialized = toBinary(ExecuteRequestSchema, request)
	const encoded = Buffer.from(serialized).toString('base64')

	// Update the mock to return the specific request
	mockHostBindings.getWasiArgs = mock(() => JSON.stringify(['program', encoded]))

	return Runner.newRunner<string>({
		configParser: (b) => {
			const stringConfig = Buffer.from(b).toString()
			expect(stringConfig).toBe(anyConfig.toString())
			return stringConfig
		},
	})
}
