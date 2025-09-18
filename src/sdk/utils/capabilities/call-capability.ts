import { doRequestAsync } from '@cre/sdk/utils/do-request-async'
import { awaitAsyncRequest } from '@cre/sdk/utils/await-async-request'
import { Mode, type CapabilityResponse } from '@cre/generated/sdk/v1alpha/sdk_pb'
import { LazyPromise } from '@cre/sdk/utils/lazy-promise'
import { runtimeGuards } from '@cre/sdk/runtime/runtime'

export type CallCapabilityParams = {
	capabilityId: string
	method: string
	mode: Mode
	payload: {
		typeUrl: string
		value: Uint8Array
	}
}

/**
 * Calls a capability asynchronously and returns a promise for the response.
 * The actual call is deferred until the promise is awaited (lazy execution).
 *
 * @param params - The capability call parameters
 * @returns A promise that resolves to the capability response
 */
export function callCapability({
	capabilityId,
	method,
	mode = Mode.DON,
	payload,
}: CallCapabilityParams): Promise<CapabilityResponse> {
	// Guards:
	// - Block DON-mode calls while currently in NODE mode
	// - Block NODE-mode calls while currently in DON mode
	if (mode === Mode.DON) runtimeGuards.assertDonSafe()
	if (mode === Mode.NODE) runtimeGuards.assertNodeSafe()

	const callbackId = doRequestAsync({
		capabilityId,
		method,
		mode,
		payload,
	})

	return new LazyPromise(() => {
		return awaitAsyncRequest(callbackId, {
			capabilityId,
			method,
			mode,
		})
	})
}
