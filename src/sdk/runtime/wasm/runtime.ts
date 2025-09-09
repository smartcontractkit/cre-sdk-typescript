import { type CapabilityRequest, type AwaitCapabilitiesRequest, type AwaitCapabilitiesResponse, type GetSecretsRequest, type AwaitSecretsRequest, type AwaitSecretsResponse, type Mode, CapabilityRequestSchema, AwaitCapabilitiesRequestSchema, AwaitCapabilitiesResponseSchema, GetSecretsRequestSchema, AwaitSecretsRequestSchema, AwaitSecretsResponseSchema } from "@cre/generated/sdk/v1alpha/sdk_pb";
import { RuntimeImpl, NodeRuntimeImpl, type RuntimeHelpers } from "../impl/runtime-impl";
import { hostBindings } from "./host-bindings";
import { fromBinary, toBinary } from "@bufbuild/protobuf";

export class Runtime<C> extends RuntimeImpl <C> {
    constructor(config: C,
            nextCallId: number,
            maxResponseSize: number) {
        super(config, nextCallId, WasmRuntimeHelpers.getInstance(), maxResponseSize)
    }
}

export class NodeRuntime<C> extends NodeRuntimeImpl<C> {
    constructor(config: C, nextCallId: number, maxResponseSize: number) {
        super(config, nextCallId, WasmRuntimeHelpers.getInstance(), maxResponseSize)
    }
}

class WasmRuntimeHelpers implements RuntimeHelpers {
    private static instance: WasmRuntimeHelpers;
    
    private constructor() {}
    
    public static getInstance(): WasmRuntimeHelpers {
        if (!WasmRuntimeHelpers.instance) {
            WasmRuntimeHelpers.instance = new WasmRuntimeHelpers();
        }
        return WasmRuntimeHelpers.instance;
    }
    
    call(request: CapabilityRequest): boolean {
        return hostBindings.callCapability(toBinary(CapabilityRequestSchema, request)) >= 0
    }
    
    await(request: AwaitCapabilitiesRequest, maxResponseSize: number): AwaitCapabilitiesResponse {
        const response = hostBindings.awaitCapabilities(toBinary(AwaitCapabilitiesRequestSchema, request), maxResponseSize)
        const responseBytes = Array.isArray(response) ? new Uint8Array(response) : response
        return fromBinary(AwaitCapabilitiesResponseSchema, responseBytes)
    }

    getSecrets(request: GetSecretsRequest, maxResponseSize: number): boolean {
        return hostBindings.getSecrets(toBinary(GetSecretsRequestSchema, request), maxResponseSize) >= 0
    }

    awaitSecrets(request: AwaitSecretsRequest, maxResponseSize: number): AwaitSecretsResponse {
        const response = hostBindings.awaitSecrets(toBinary(AwaitSecretsRequestSchema, request), maxResponseSize)
        const responseBytes = Array.isArray(response) ? new Uint8Array(response) : response
        return fromBinary(AwaitSecretsResponseSchema, responseBytes)
    }

    switchModes(mode: Mode): void {
        hostBindings.switchModes(mode)
    }
}