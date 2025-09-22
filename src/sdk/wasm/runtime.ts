import { fromBinary, toBinary } from '@bufbuild/protobuf'
import {
	type AwaitCapabilitiesRequest,
	AwaitCapabilitiesRequestSchema,
	type AwaitCapabilitiesResponse,
	AwaitCapabilitiesResponseSchema,
	type AwaitSecretsRequest,
	AwaitSecretsRequestSchema,
	type AwaitSecretsResponse,
	AwaitSecretsResponseSchema,
	type CapabilityRequest,
	CapabilityRequestSchema,
	type GetSecretsRequest,
	GetSecretsRequestSchema,
	type Mode,
} from '@cre/generated/sdk/v1alpha/sdk_pb'
import { NodeRuntimeImpl, type RuntimeHelpers, RuntimeImpl } from '../impl/runtime-impl'
import { hostBindings } from './host-bindings'

export class Runtime<C> extends RuntimeImpl<C> {
	constructor(config: C, nextCallId: number, maxResponseSize: bigint) {
		super(config, nextCallId, WasmRuntimeHelpers.getInstance(), maxResponseSize)
	}
}

export class NodeRuntime<C> extends NodeRuntimeImpl<C> {
	constructor(config: C, nextCallId: number, maxResponseSize: bigint) {
		super(config, nextCallId, WasmRuntimeHelpers.getInstance(), maxResponseSize)
	}
}

class WasmRuntimeHelpers implements RuntimeHelpers {
	private static instance: WasmRuntimeHelpers

	private constructor() {}
	now(): number {
		return hostBindings.now()
	}

	public static getInstance(): WasmRuntimeHelpers {
		if (!WasmRuntimeHelpers.instance) {
			WasmRuntimeHelpers.instance = new WasmRuntimeHelpers()
		}
		return WasmRuntimeHelpers.instance
	}

	call(request: CapabilityRequest): boolean {
		return hostBindings.callCapability(toBinary(CapabilityRequestSchema, request)) >= 0
	}

	await(request: AwaitCapabilitiesRequest, maxResponseSize: bigint): AwaitCapabilitiesResponse {
		const response = hostBindings.awaitCapabilities(
			toBinary(AwaitCapabilitiesRequestSchema, request),
			Number(maxResponseSize),
		)
		const responseBytes = Array.isArray(response) ? new Uint8Array(response) : response
		return fromBinary(AwaitCapabilitiesResponseSchema, responseBytes)
	}

	getSecrets(request: GetSecretsRequest, maxResponseSize: bigint): boolean {
		return (
			hostBindings.getSecrets(
				toBinary(GetSecretsRequestSchema, request),
				Number(maxResponseSize),
			) >= 0
		)
	}

	awaitSecrets(request: AwaitSecretsRequest, maxResponseSize: bigint): AwaitSecretsResponse {
		const response = hostBindings.awaitSecrets(
			toBinary(AwaitSecretsRequestSchema, request),
			Number(maxResponseSize),
		)
		const responseBytes = Array.isArray(response) ? new Uint8Array(response) : response
		return fromBinary(AwaitSecretsResponseSchema, responseBytes)
	}

	switchModes(mode: Mode): void {
		hostBindings.switchModes(mode)
	}
}
