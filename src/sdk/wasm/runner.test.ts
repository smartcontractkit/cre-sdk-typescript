import { afterEach, describe, expect, mock, test } from 'bun:test'
import { create, fromBinary, toBinary } from '@bufbuild/protobuf'
import { anyPack, EmptySchema } from '@bufbuild/protobuf/wkt'
import { OutputsSchema } from '@cre/generated/capabilities/internal/basictrigger/v1/basic_trigger_pb'
import {
	AwaitSecretsRequestSchema,
	AwaitSecretsResponseSchema,
	type ExecuteRequest,
	ExecuteRequestSchema,
	GetSecretsRequestSchema,
	SecretResponseSchema,
	SecretResponsesSchema,
	SecretSchema,
	TriggerSchema,
} from '@cre/generated/sdk/v1alpha/sdk_pb'
import { BasicCapability as BasicTriggerCapability } from '@cre/generated-sdk/capabilities/internal/basictrigger/v1/basic_sdk_gen'
import { cre } from '@cre/sdk/cre'
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
	test('should create workflows', async () => {
		assertEnv(await getTestRunner(subscribeRequest))
	})

	test('get secrets passes max response size', async () => {
		const anySecretResponse = create(SecretResponseSchema, {
			response: {
				case: 'secret',
				value: create(SecretSchema, { id: 'Bar', namespace: 'Foo', owner: 'Baz', value: 'Qux' }),
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
			const secret = await secretsProvider.getSecret({ namespace: 'Foo', id: 'Bar' })
			expect(secret.namespace).toBe('Foo')
			expect(secret.id).toBe('Bar')
			expect(secret.owner).toBe('Baz')
			expect(secret.value).toBe('Qux')
			return [cre.handler(basicTrigger.trigger({}), () => 10)]
		})
		expect(true).toBe(true)
	})
})

function assertEnv(r: Runner<string>) {
	let ran = false
	const verifyEnv = (config: string, _: SecretsProvider) => {
		ran = true
		expect(config).toBe(anyConfig.toString())
		return []
	}
	r.run(verifyEnv)
	expect(ran).toBe(true)
}

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

/*

var (

func TestRunner_GetSecrets_PassesMaxResponseSize(t *testing.T) {
	dr := getTestRunner(t, subscribeRequest)
	dr.Run(func(_ string, _ *slog.Logger, secretsProvider cre.SecretsProvider) (cre.Workflow[string], error) {
		_, err := secretsProvider.GetSecret(&sdk.SecretRequest{Namespace: "Foo", Id: "Bar"}).Await()
		// This will fail with "buffer cannot be empty" if we fail to pass the maxResponseSize from the
		// runner to the runtime.
		assert.ErrorContains(t, err, "secret Foo.Bar not found")

		return cre.Workflow[string]{
			cre.Handler(
				basictrigger.Trigger(testutils.TestWorkflowTriggerConfig()),
				func(string, cre.Runtime, *basictrigger.Outputs) (int, error) {
					return 0, nil
				}),
		}, nil
	})
}

func TestRunner_Run(t *testing.T) {
	t.Run("runner gathers subscriptions", func(t *testing.T) {
		dr := getTestRunner(t, subscribeRequest)
		dr.Run(func(string, *slog.Logger, cre.SecretsProvider) (cre.Workflow[string], error) {
			return cre.Workflow[string]{
				cre.Handler(
					basictrigger.Trigger(testutils.TestWorkflowTriggerConfig()),
					func(string, cre.Runtime, *basictrigger.Outputs) (int, error) {
						require.Fail(t, "Must not be called during registration to tiggers")
						return 0, nil
					}),
			}, nil
		})

		actual := &sdk.ExecutionResult{}
		sentResponse := dr.(runnerWrapper[string]).baseRunner.(*subscriber[string, cre.Runtime]).runnerInternals.(*runnerInternalsTestHook).sentResponse
		require.NoError(t, proto.Unmarshal(sentResponse, actual))

		switch result := actual.Result.(type) {
		case *sdk.ExecutionResult_TriggerSubscriptions:
			subscriptions := result.TriggerSubscriptions.Subscriptions
			require.Len(t, subscriptions, 1)
			subscription := subscriptions[triggerIndex]
			assert.Equal(t, capID, subscription.Id)
			assert.Equal(t, "Trigger", subscription.Method)
			payload := &basictrigger.Config{}
			require.NoError(t, subscription.Payload.UnmarshalTo(payload))
			assert.True(t, proto.Equal(testutils.TestWorkflowTriggerConfig(), payload))
		default:
			assert.Fail(t, "unexpected result type", result)
		}
	})

	t.Run("makes callback with correct runner", func(t *testing.T) {
		testutils.SetupExpectedCalls(t)
		dr := getTestRunner(t, anyExecuteRequest)
		testutils.RunTestWorkflow(dr)

		actual := &sdk.ExecutionResult{}
		sentResponse := dr.(runnerWrapper[string]).baseRunner.(*runner[string, cre.Runtime]).runnerInternals.(*runnerInternalsTestHook).sentResponse
		require.NoError(t, proto.Unmarshal(sentResponse, actual))

		switch result := actual.Result.(type) {
		case *sdk.ExecutionResult_Value:
			v, err := values.FromProto(result.Value)
			require.NoError(t, err)
			returnedValue, err := v.Unwrap()
			require.NoError(t, err)
			assert.Equal(t, testutils.TestWorkflowExpectedResult(), returnedValue)
		default:
			assert.Fail(t, "unexpected result type", result)
		}
	})

	t.Run("makes callback with correct runner and multiple handlers", func(t *testing.T) {
		secondTriggerReq := &sdk.ExecuteRequest{
			Config:          anyConfig,
			MaxResponseSize: anyMaxResponseSize,
			Request: &sdk.ExecuteRequest_Trigger{
				Trigger: &sdk.Trigger{
					Id:      uint64(triggerIndex + 1),
					Payload: mustAny(testutils.TestWorkflowTrigger()),
				},
			},
		}
		testutils.SetupExpectedCalls(t)
		dr := getTestRunner(t, secondTriggerReq)
		testutils.RunIdenticalTriggersWorkflow(dr)

		actual := &sdk.ExecutionResult{}
		sentResponse := dr.(runnerWrapper[string]).baseRunner.(*runner[string, cre.Runtime]).runnerInternals.(*runnerInternalsTestHook).sentResponse
		require.NoError(t, proto.Unmarshal(sentResponse, actual))

		switch result := actual.Result.(type) {
		case *sdk.ExecutionResult_Value:
			v, err := values.FromProto(result.Value)
			require.NoError(t, err)
			returnedValue, err := v.Unwrap()
			require.NoError(t, err)
			assert.Equal(t, testutils.TestWorkflowExpectedResult()+"true", returnedValue)
		default:
			assert.Fail(t, "unexpected result type", result)
		}
	})
}


func testRunnerInternals(tb testing.TB, request *sdk.ExecuteRequest) *runnerInternalsTestHook {
	serialzied, err := proto.Marshal(request)
	require.NoError(tb, err)
	encoded := base64.StdEncoding.EncodeToString(serialzied)

	return &runnerInternalsTestHook{
		testTb:    tb,
		arguments: []string{"wasm", encoded},
	}
}

func testRuntimeInternals(tb testing.TB) *runtimeInternalsTestHook {
	return &runtimeInternalsTestHook{
		testTb:                  tb,
		outstandingCalls:        map[int32]cre.Promise[*sdk.CapabilityResponse]{},
		outstandingSecretsCalls: map[int32]cre.Promise[[]*sdk.SecretResponse]{},
		secrets:                 map[string]*sdk.Secret{},
	}
}

func mustAny(msg proto.Message) *anypb.Any {
	a, err := anypb.New(msg)
	if err != nil {
		panic(err)
	}
	return a
}

*/
