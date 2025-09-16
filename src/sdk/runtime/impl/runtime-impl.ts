import type { Runtime, BaseRuntime, CallCapabilityParams, NodeRuntime } from '@cre/sdk/runtime/runtime';
import { 
    type AwaitCapabilitiesRequest, 
    type AwaitCapabilitiesResponse, 
    type CapabilityRequest, 
    type GetSecretsRequest,
    type AwaitSecretsRequest,
    type AwaitSecretsResponse,
    Mode,
    AwaitCapabilitiesRequestSchema,
    type SecretRequest,
    GetSecretsRequestSchema,
    AwaitSecretsRequestSchema,
    type Secret,
    SimpleConsensusInputsSchema
} from "@cre/generated/sdk/v1alpha/sdk_pb";
import { type Any } from "@bufbuild/protobuf/wkt";
import { anyPack, anyUnpack } from "@bufbuild/protobuf/wkt";
import { create, type Message } from '@bufbuild/protobuf'
import { CapabilityRequestSchema } from "@cre/generated/sdk/v1alpha/sdk_pb";
import { LazyPromise } from '@cre/sdk/utils/lazy-promise';
import { CapabilityError } from '@cre/sdk/utils/capabilities/capability-error';
import { DonModeError, NodeModeError, SecretsError } from '../errors';
import { Value, type ConsensusAggregation, type CreSerializable, type PrimitiveTypes, type UnwrapOptions } from '@cre/sdk/utils';
import { ConsensusCapability } from '@cre/generated-sdk/capabilities/internal/consensus/v1alpha/consensus_sdk_gen';

export class BaseRuntimeImpl<C> implements BaseRuntime<C> {
    // modeError must only be set from within NodeRuntimeImpl
    public modeError?: Error

    constructor(
        public config: C,
        public nextCallId: number,
        protected helpers: RuntimeHelpers,
        protected maxResponseSize: number,
        private mode: Mode) { }
    
    callCapability<I extends Message, O extends Message>({
        capabilityId,
        method,
        payload,
        inputSchema,
        outputSchema
    }: CallCapabilityParams<I, O>): Promise<O> {

        if (this.modeError) {
            return Promise.reject(this.modeError)
        }

        // nextCallId tracks the unique id for a request to the WASM host.
        // to avoid collisions of the ID in different modes, it is
        // incremented in DON mode and decremented in Node mode.
        // eg. - first call don mode: nextCallId = 1
        //     - second call: nextCallId = 2
        //     - first call node mode: nextCallId = -1
        //     - second call node mode: nextCallId = -2
        //     - etc...

        const anyPayload = anyPack(inputSchema, payload)
        const callbackId = this.nextCallId
        if (this.mode == Mode.DON) this.nextCallId++
        else this.nextCallId--

        const req = create(CapabilityRequestSchema, {
        id: capabilityId,
        method,
        payload: anyPayload,
        callbackId,
    })
        if (!this.helpers.call(req)) {
            return Promise.reject(new CapabilityError(`Capability not found ${capabilityId}`, {
                callbackId,
                method,
                capabilityId
            }))
        }

        return new LazyPromise(async () => {
            const awaitRequest = create(AwaitCapabilitiesRequestSchema, {ids: [callbackId]})
            const awaitResponse = this.helpers.await(awaitRequest, this.maxResponseSize)
            const capabilityResponse = awaitResponse.responses[callbackId]
            
                if (!capabilityResponse) {
                    throw new CapabilityError(`No response found for callback ID ${callbackId}`, {
                        capabilityId,
                        method,
                        callbackId,
                    })
                }
            
            const response = capabilityResponse.response
            switch (response.case) {
                case "payload": 
                    return anyUnpack(response.value as Any, outputSchema) as O
                case "error":
                    throw new CapabilityError(`Error ${response.value}`, { capabilityId, method, callbackId })
                default:
                    throw new CapabilityError(`Error cannot unwrap ${response.case}`, {capabilityId, method, callbackId})
            }
        })
    }

    getNextCallId(): number {
        return this.nextCallId
    }
}

export class NodeRuntimeImpl<C> extends BaseRuntimeImpl<C> implements NodeRuntime<C>{
    _isNodeRuntime: true = true;
    constructor(
         config: C,
        nextCallId: number,
        helpers: RuntimeHelpers,
        maxResponseSize: number) { 
         super(config, nextCallId, helpers, maxResponseSize, Mode.NODE)
        }
}

export class RuntimeImpl<C> extends BaseRuntimeImpl<C> implements Runtime<C> {
    private nextNodeCallId: number = -1

    constructor(
         config: C,
        nextCallId: number,
        helpers: RuntimeHelpers,
        maxResponseSize: number) { 
         super(config, nextCallId, helpers, maxResponseSize, Mode.DON)
        }
    
    
    runInNodeMode<TArgs extends any[], TOutput>(
        fn: (nodeRuntime: NodeRuntime<C>, ...args: TArgs) => Promise<TOutput> | TOutput,
        consesusAggretation: ConsensusAggregation<TOutput, true>,
        unwrapOptions?: TOutput extends PrimitiveTypes ? never : UnwrapOptions<TOutput>
    ): (...args: TArgs) => Promise<TOutput> {
        return async (...args: TArgs): Promise<TOutput> => {
            this.modeError = new DonModeError()
            const nodeRuntime = new NodeRuntimeImpl(this.config, this.nextNodeCallId, this.helpers, this.maxResponseSize)
            this.helpers.switchModes(Mode.NODE)
            
                    const consensusInput = create(SimpleConsensusInputsSchema, { descriptors: consesusAggretation.descriptor })
                    if (consesusAggretation.defaultValue) {
                        // This cast is safe, since ConsensusAggregation can only have true its second argument if T extends CreSerializable<TOutput>
                        consensusInput.default = Value.from(consesusAggretation.defaultValue as CreSerializable<TOutput>).proto()
                    }
            
                    try {
                        const observation = await fn(nodeRuntime, ...args)
                        // This cast is safe, since ConsensusAggregation can only have true its second argument if T extends CreSerializable<TOutput>
                        consensusInput.observation = { case: 'value', value: Value.from(observation as CreSerializable<TOutput>).proto()  }
                    
                    } catch (e: any) {
                        consensusInput.observation = { case: 'error', value: e.message || String(e) }
                    } finally {
                        // Always restore DON mode before invoking consensus
                        this.modeError = undefined
                        this.nextNodeCallId = nodeRuntime.nextCallId
                        nodeRuntime.modeError = new NodeModeError()
                        this.helpers.switchModes(Mode.DON)
                    }
            
                    const consensus = new ConsensusCapability()
                    const result = await consensus.simple(consensusInput)
                    const wrappedValue = Value.wrap(result)
                    
                    return unwrapOptions 
                        ? wrappedValue.unwrapToType(unwrapOptions)
                        : wrappedValue.unwrap() as TOutput
        }
    }

    getSecret(request: SecretRequest): Promise<Secret> {
        const id = this.nextCallId
        this.nextCallId++
        const secretsReq = create(GetSecretsRequestSchema, {
            callbackId: id,
            requests: [request],
        })
        if (!this.helpers.getSecrets(secretsReq, this.maxResponseSize)) {
            return Promise.reject(new SecretsError(request, "host is not making the secrets request"))
        }

        return new LazyPromise(async () => {
            const awaitRequest = create(AwaitSecretsRequestSchema, {ids: [id]})
            const awaitResponse = this.helpers.awaitSecrets(awaitRequest, this.maxResponseSize)
            const secretsResponse = awaitResponse.responses[id]
            
                if (!secretsResponse) {
                    throw new SecretsError(request, "no response")
                }
            
            const responses = secretsResponse.responses
            if (responses.length != 1) {
                throw new SecretsError(request, "invalid value returned from host")
            }

            const response = responses[0].response
            switch (response.case) {
                case "secret": 
                    return response.value
                case "error":
                    throw new SecretsError(request, response.value.error)
                default:
                    throw new SecretsError(request, "cannot unmashal returned value from host")
            }
        })
    }
}

export interface RuntimeHelpers {
    call(request: CapabilityRequest): boolean
    await(request: AwaitCapabilitiesRequest, maxResponseSize: number): AwaitCapabilitiesResponse

    getSecrets(request: GetSecretsRequest, maxResponseSize: number): boolean
    awaitSecrets(request: AwaitSecretsRequest, maxResponseSize: number): AwaitSecretsResponse
    
    switchModes(mode: Mode): void
}