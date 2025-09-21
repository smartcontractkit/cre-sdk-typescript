import { create, fromBinary, toBinary } from '@bufbuild/protobuf'
import type { Mode } from '@cre/generated/sdk/v1alpha/sdk_pb'
import {
	AwaitCapabilitiesRequestSchema,
	AwaitCapabilitiesResponseSchema,
	type CapabilityResponse,
} from '@cre/generated/sdk/v1alpha/sdk_pb'
import { hostBindings } from '@cre/sdk/runtime/host-bindings'
import { CapabilityError } from '@cre/sdk/utils/capabilities/capability-error'

type Params = {
	capabilityId: string
	method: string
	mode: Mode
}

// Implementation signature (general fallback)
export async function awaitAsyncRequest(
	callbackId: number,
	{ capabilityId, method, mode }: Params,
): Promise<CapabilityResponse> {
	// Create proper AwaitCapabilitiesRequest protobuf message
	const awaitRequest = create(AwaitCapabilitiesRequestSchema, {
		ids: [callbackId],
	})

	// Encode to protobuf bytes
	const awaitRequestBytes = toBinary(AwaitCapabilitiesRequestSchema, awaitRequest)

	const response = hostBindings.awaitCapabilities(awaitRequestBytes, 1024 * 1024)

	// Convert array of numbers to Uint8Array if needed
	const responseBytes = Array.isArray(response) ? new Uint8Array(response) : response

	const awaitResponse = fromBinary(AwaitCapabilitiesResponseSchema, responseBytes)
	const capabilityResponse = awaitResponse.responses[callbackId]

	if (!capabilityResponse) {
		throw new CapabilityError(`No response found for callback ID ${callbackId}`, {
			capabilityId,
			method,
			mode,
			callbackId,
		})
	}

	return capabilityResponse
}
