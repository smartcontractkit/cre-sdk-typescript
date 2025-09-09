import type { Runtime, BaseRuntime, CallCapabilityParams, NodeRuntime, ConsensusAggregation } from '@cre/sdk/runtime/runtime';
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
    type SimpleConsensusInputs,
    SimpleConsensusInputsSchema
} from "@cre/generated/sdk/v1alpha/sdk_pb";
import { type Any } from "@bufbuild/protobuf/wkt";
import { anyPack, anyUnpack } from "@bufbuild/protobuf/wkt";
import { create, type Message } from '@bufbuild/protobuf'
import { CapabilityRequestSchema } from "@cre/generated/sdk/v1alpha/sdk_pb";
import { LazyPromise } from '@cre/sdk/utils/lazy-promise';
import { CapabilityError } from '@cre/sdk/utils/capabilities/capability-error';
import { DonModeError, NodeModeError, SecretsError } from '../errors';
import { unknown } from 'zod/v4';
import { Consensus } from '@cre/generated/capabilities/internal/consensus/v1alpha/consensus_pb';

export class BaseRuntimeImpl<C> implements BaseRuntime<C> {
    // modeError must only be set from within NodeRuntimeImpl
    public modeError?: Error

    constructor(
        public config: C,
        protected nextCallId: number,
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
    
    runInNodeMode<O>(callback: (nodeRuntime: NodeRuntime<C>) => O, ca: ConsensusAggregation<O>): Promise<O> {
        const nodeRuntime = new NodeRuntimeImpl(this.config, this.nextNodeCallId, this.helpers, this.maxResponseSize)
        this.modeError = new DonModeError()
        this.helpers.switchModes(Mode.NODE)
        
        const input = create(SimpleConsensusInputsSchema, {
            default: ca.default,
        })
        try {
            const result = callback(nodeRuntime)
        }
        const observation = /* TODO */ unknown        
        this.helpers.switchModes(Mode.DON)
        nodeRuntime.modeError = new NodeModeError()
        this.modeError = undefined
        this.nextNodeCallId = nodeRuntime.getNextCallId()
        // TODO    
    /*

	c := &consensus.Consensus{}
	return cre.Then(c.Simple(d, observation), func(result *valuespb.Value) (values.Value, error) {
		return values.FromProto(result)
	})

        */


        throw new Error('Method not implemented.');
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