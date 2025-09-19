import { describe, expect, test, mock } from 'bun:test'
import { create, type Message } from "@bufbuild/protobuf"
import { OutputsSchema as TriggerOutputsSchema } from "@cre/generated/capabilities/internal/basictrigger/v1/basic_trigger_pb"
import { BasicActionCapability } from '@cre/generated-sdk/capabilities/internal/basicaction/v1/basicaction_sdk_gen'
import { BasicCapability } from '@cre/generated-sdk/capabilities/internal/actionandtrigger/v1/basic_sdk_gen'
import { RuntimeImpl, type RuntimeHelpers } from './runtime-impl'
import { type CapabilityRequest, type AwaitCapabilitiesRequest, type AwaitCapabilitiesResponse, type GetSecretsRequest, type AwaitSecretsRequest, type AwaitSecretsResponse, type Mode, type CapabilityResponse, CapabilityResponseSchema, AwaitCapabilitiesResponseSchema, type SimpleConsensusInputs, type SimpleConsensusInputsJson } from '@cre/generated/sdk/v1alpha/sdk_pb'
import { InputsSchema, OutputsSchema } from '@cre/generated/capabilities/internal/basicaction/v1/basic_action_pb'
import { InputSchema, OutputSchema as OutputSchema } from '@cre/generated/capabilities/internal/actionandtrigger/v1/action_and_trigger_pb'
import { anyPack, ValueSchema, type Any } from '@bufbuild/protobuf/wkt'
import { CapabilityError } from '@cre/sdk/utils/capabilities/capability-error'
import { ConsensusCapability } from '@cre/generated-sdk/capabilities/internal/consensus/v1alpha/consensus_sdk_gen'
import type { Runtime } from '@cre/sdk/cre'
import { Value } from '@cre/sdk/utils'


// Helper function to create a RuntimeHelpers mock with error-throwing defaults
function createRuntimeHelpersMock(overrides: Partial<RuntimeHelpers> = {}): RuntimeHelpers {
    // Create default implementation that throws errors for all methods
    const defaultMock: RuntimeHelpers = {
        call: mock(() => { throw new Error('Method not implemented: call') }),
        await: mock(() => { throw new Error('Method not implemented: await') }),
        getSecrets: mock(() => { throw new Error('Method not implemented: getSecrets') }),
        awaitSecrets: mock(() => { throw new Error('Method not implemented: awaitSecrets') }),
		switchModes: mock(() => { throw new Error('Method not implemented: switchModes') })
		now: mock(() => { throw new Error('Method not implemented: now') })
    }

    // Return a merged object with overrides taking precedence
    return { ...defaultMock, ...overrides }
}

const anyMaxSize = 1024 * 1024

describe('test runtime', () => {
    describe('test call capability', () => {
		test.skip('runs async - proper async implementation in progress', async () => {
		
        const anyResult1 = "ok1"
            const anyResult2 = "ok2"
            var expectedCall = 1
            var expectedAwait = 2
        
            const helpers = createRuntimeHelpersMock({
                call: mock((request: CapabilityRequest) => {
                    switch (request.callbackId) {
                        case 1:
                            expect(request.id).toEqual(BasicActionCapability.CAPABILITY_ID)
                            expect(request.method).toEqual("PerformAction")
                            expect(1).toEqual(expectedCall)
                            expectedCall++
                            return true
                        case 2:
                            expect(request.id).toEqual(BasicCapability.CAPABILITY_ID)
                            expect(request.method).toEqual("Action")
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
                            [id]: create(CapabilityResponseSchema, { response: { case: "payload", value: payload } })
                        }
                    })
                })
            })

            

            const runtime = new RuntimeImpl<any>({}, 1, helpers, anyMaxSize)
            const workflowAction1 = new BasicActionCapability()
            const call1 = workflowAction1.performAction(runtime, create(InputsSchema, { inputThing: true }))
            const workflowAction2 = new BasicCapability()
            const call2 = workflowAction2.action(runtime, create(InputSchema, { name: "input" }))
            const result2 = await call2
            expect(result2.welcome).toEqual(anyResult2)
            const result1 = await call1
            expect(result1.adaptedThing).toEqual(anyResult1)
		})
		

		test('call capability errors', async () => {
			const helpers = createRuntimeHelpersMock({
				call: mock((_: CapabilityRequest) => {
					return false
				})
			})


			const runtime = new RuntimeImpl<any>({}, 1, helpers, anyMaxSize)
			const workflowAction1 = new BasicActionCapability()
			const call1 = workflowAction1.performAction(runtime, create(InputsSchema, { inputThing: true }))

			expect(call1).rejects.toThrow(new CapabilityError(`Capability not found ${BasicActionCapability.CAPABILITY_ID}`, { callbackId: 1, capabilityId: BasicActionCapability.CAPABILITY_ID, method: "PerformAction" }))
		})

		test('capability errors are returned to the caller', async () => {
			const anyError = "error"
			const helpers = createRuntimeHelpersMock({
				call: mock((_: CapabilityRequest) => {
					return true
				}),
				await: mock((request: AwaitCapabilitiesRequest) => {
					expect(request.ids.length).toEqual(1)
					return create(AwaitCapabilitiesResponseSchema, {
						responses: {
							[request.ids[0]]: create(CapabilityResponseSchema, { response: { case: "error", value: anyError } })
						}
					})
				})
			})

			const runtime = new RuntimeImpl<any>({}, 1, helpers, anyMaxSize)
			const workflowAction1 = new BasicActionCapability()
			const call1 = workflowAction1.performAction(runtime, create(InputsSchema, { inputThing: true }))

			expect(call1).rejects.toThrow(new CapabilityError("Error " + anyError, { callbackId: 1, capabilityId: BasicActionCapability.CAPABILITY_ID, method: "PerformAction" }))
		})

		test('await errors', async () => {
			const anyError = "error"
			const helpers = createRuntimeHelpersMock({
				call: mock((_: CapabilityRequest) => {
					return true
				}),
				await: mock((_: AwaitCapabilitiesRequest) => {
					throw new Error(anyError)
				})
			})

			const runtime = new RuntimeImpl<any>({}, 1, helpers, anyMaxSize)
			const workflowAction1 = new BasicActionCapability()
			const call1 = workflowAction1.performAction(runtime, create(InputsSchema, { inputThing: true }))

			expect(call1).rejects.toThrow(new CapabilityError(anyError, { callbackId: 1, capabilityId: BasicActionCapability.CAPABILITY_ID, method: "PerformAction" }))
		})

		test('await missing response', async () => {
			const helpers = createRuntimeHelpersMock({
				call: mock((_: CapabilityRequest) => {
					return true
				}),
				await: mock((_: AwaitCapabilitiesRequest) => {
					return create(AwaitCapabilitiesResponseSchema, { responses: {} })
				})
			})

			const runtime = new RuntimeImpl<any>({}, 1, helpers, anyMaxSize)
			const workflowAction1 = new BasicActionCapability()
			const call1 = workflowAction1.performAction(runtime, create(InputsSchema, { inputThing: true }))

			expect(call1).rejects.toThrow(new CapabilityError("No response found for callback ID 1", { callbackId: 1, capabilityId: BasicActionCapability.CAPABILITY_ID, method: "PerformAction" }))
		})
    })
})

describe('test now conversts to date', () => {
	test('now converts to date', () => {
		const helpers = createRuntimeHelpersMock({
			now: mock(() => 1716153600000 / 1000000)
		})

		const runtime = new RuntimeImpl<any>({}, 1, helpers, anyMaxSize)
		const now = runtime.now()
		expect(now).toEqual(new Date(1716153600000))
	})
})

describe('test run in node mode', () => {
	test('successful consensus', () => {
		const helpers = createRuntimeHelpersMock({
			
		})

		const anyObservation = 10
		const anyMedian = 11

		ConsensusCapability.prototype.simple = mock((_: Runtime<any>, inputs: SimpleConsensusInputs | SimpleConsensusInputsJson) => {
			expect(inputs.observation.case).toEqual('value')
			expect(Value.wrap(inputs.observation.value).unwrapToType<number>()).toEqual(anyObservation)
			return Promise.resolve(Value.from(anyMedian).proto())
		})
	})
})

/*

func TestDonRuntime_RunInNodeMode(t *testing.T) {
	t.Run("Successful consensus", func(t *testing.T) {
		nodeMock, err := nodeactionmock.NewBasicActionCapability(t)
		require.NoError(t, err)
		anyObservation := int32(10)
		anyMedian := int64(11)
		nodeMock.PerformAction = func(ctx context.Context, input *nodeaction.NodeInputs) (*nodeaction.NodeOutputs, error) {
			return &nodeaction.NodeOutputs{OutputThing: anyObservation}, nil
		}

		mockSimpleConsensus(t, &consensusValues[int64]{GiveObservation: int64(anyObservation), WantResponse: anyMedian})

		test := func(config string, rt cre.Runtime, _ *basictrigger.Outputs) (int64, error) {
			result, err := cre.RunInNodeMode(config, rt, func(_ string, runtime cre.NodeRuntime) (int64, error) {
				capability := &nodeaction.BasicAction{}
				value, err := capability.PerformAction(runtime, &nodeaction.NodeInputs{InputThing: true}).Await()
				require.NoError(t, err)
				return int64(value.OutputThing), nil
			}, cre.ConsensusMedianAggregation[int64]()).Await()
			return result, err
		}

		result, err := testRuntime(t, test)
		require.NoError(t, err)
		assert.Equal(t, anyMedian, result)
	})

	t.Run("Failed consensus", func(t *testing.T) {
		anyError := errors.New("error")

		mockSimpleConsensus(t, &consensusValues[int64]{GiveErr: anyError})

		test := func(config string, rt cre.Runtime, _ *basictrigger.Outputs) (int64, error) {
			return cre.RunInNodeMode(config, rt, func(_ string, _ cre.NodeRuntime) (int64, error) {
				return int64(0), anyError
			}, cre.ConsensusMedianAggregation[int64]()).Await()
		}

		_, err := testRuntime(t, test)
		require.ErrorContains(t, err, anyError.Error())
	})

	t.Run("Node runtime in Don mode fails", func(t *testing.T) {
		nodeCapability, err := nodeactionmock.NewBasicActionCapability(t)
		require.NoError(t, err)
		nodeCapability.PerformAction = func(_ context.Context, _ *nodeaction.NodeInputs) (*nodeaction.NodeOutputs, error) {
			assert.Fail(t, "node capability should not be called")
			return nil, fmt.Errorf("should not be called")
		}

		test := func(config string, rt cre.Runtime, input *basictrigger.Outputs) (*nodeaction.NodeOutputs, error) {
			var nrt cre.NodeRuntime
			cre.RunInNodeMode(config, rt, func(_ string, nodeRuntime cre.NodeRuntime) (int32, error) {
				nrt = nodeRuntime
				return 0, err
			}, cre.ConsensusMedianAggregation[int32]())
			na := nodeaction.BasicAction{}
			return na.PerformAction(nrt, &nodeaction.NodeInputs{InputThing: true}).Await()
		}

		_, err = testRuntime(t, test)
		assert.Equal(t, cre.NodeModeCallInDonMode(), err)
	})

	t.Run("Don runtime in Node mode fails", func(t *testing.T) {
		capability, err := basicactionmock.NewBasicActionCapability(t)
		require.NoError(t, err)
		capability.PerformAction = func(_ context.Context, _ *basicaction.Inputs) (*basicaction.Outputs, error) {
			assert.Fail(t, "should not be called")
			return nil, errors.New("should not be called")
		}

		test := func(config string, rt cre.Runtime, input *basictrigger.Outputs) (int32, error) {
			consensus := cre.RunInNodeMode(config, rt, func(_ string, nodeRuntime cre.NodeRuntime) (int32, error) {
				action := basicaction.BasicAction{}
				_, err := action.PerformAction(rt, &basicaction.Inputs{InputThing: true}).Await()
				return 0, err
			}, cre.ConsensusMedianAggregation[int32]())

			return consensus.Await()
		}
		_, err = testRuntime(t, test)
		assert.Equal(t, cre.DonModeCallInNodeMode(), err)
	})
}

func testRuntime[T any](t *testing.T, testFn func(config string, rt cre.Runtime, _ *basictrigger.Outputs) (T, error)) (any, error) {
	runtime := testutils.NewRuntime(t, map[string]string{})
	return testFn(anyEnvConfig, runtime, anyTrigger)
}

type consensusValues[T any] struct {
	GiveObservation T
	GiveErr         error
	WantResponse    T
}

func mockSimpleConsensus[T any](t *testing.T, values *consensusValues[T]) {
	consensus, err := consensusmock.NewConsensusCapability(t)
	require.NoError(t, err)

	consensus.Simple = func(ctx context.Context, input *sdk.SimpleConsensusInputs) (*valuespb.Value, error) {
		return handleSimpleConsensusRequest(t, values, input)
	}
}

// handleSimpleConsensusRequest is a private helper to process the gRPC request
// It extracts and validates inputs, and constructs the response based on generic types.
func handleSimpleConsensusRequest[T any](
	t *testing.T,
	values *consensusValues[T],
	input *sdk.SimpleConsensusInputs,
) (*valuespb.Value, error) {
	// 1. Initial Validation: Default input value
	assert.Nil(t, input.Default.Value, "Default input value should be nil") // Added custom message

	// 2. Validate Descriptor Type
	switch d := input.Descriptors.Descriptor_.(type) {
	case *sdk.ConsensusDescriptor_Aggregation:
		assert.Equal(t, sdk.AggregationType_AGGREGATION_TYPE_MEDIAN, d.Aggregation, "Descriptor aggregation type mismatch") // Added custom message
	default:
		assert.Fail(t, "unexpected descriptor type: %T", d)
		return nil, errors.New("unsupported descriptor type") // Return early on fail
	}

	// 3. Handle Observation Type
	switch o := input.Observation.(type) {
	case *sdk.SimpleConsensusInputs_Value:
		// Handle value observation
		return handleSimpleConsensusValueObservation(t, values, o.Value)
	case *sdk.SimpleConsensusInputs_Error:
		// Handle error observation
		assert.Equal(t, values.GiveErr.Error(), o.Error, "Error observation message mismatch")
		return nil, values.GiveErr
	default:
		// Unexpected top-level observation type
		require.Fail(t, fmt.Sprintf("unexpected observation type: %T", o))
		return nil, errors.New("unsupported observation type")
	}
}

// handleSimpleConsensusValueObservation processes the value observation part of the input.
func handleSimpleConsensusValueObservation[T any](
	t *testing.T,
	values *consensusValues[T],
	obsValue *valuespb.Value, // The actual *valuespb.Value from the observation
) (*valuespb.Value, error) {
	assert.Nil(t, values.GiveErr, "Expected no error from consensusValues, but GiveErr is not nil")
	wrappedExpectedObs, err := vals.Wrap(values.GiveObservation)
	require.NoError(t, err)

	assert.True(t, proto.Equal(vals.Proto(wrappedExpectedObs), obsValue))
	wrapped, err := vals.Wrap(values.WantResponse)
	require.NoError(t, err, "Failed to wrap the observation value")
	return vals.Proto(wrapped), nil
}

type awaitOverride struct {
	sdkimpl.RuntimeHelpers
	await func(request *sdk.AwaitCapabilitiesRequest, maxResponseSize uint64) (*sdk.AwaitCapabilitiesResponse, error)
}

func (a *awaitOverride) Await(request *sdk.AwaitCapabilitiesRequest, maxResponseSize uint64) (*sdk.AwaitCapabilitiesResponse, error) {
	return a.await(request, maxResponseSize)
}
*/



/*

MOVE



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