import { create, fromJson, type MessageInitShape } from '@bufbuild/protobuf'
import {
	type ConfidentialHTTPRequest,
	type ConfidentialHTTPRequestJson,
	ConfidentialHTTPRequestSchema,
	type HTTPResponse,
	HTTPResponseSchema,
} from '@cre/generated/capabilities/networking/confidentialhttp/v1alpha/client_pb'
import type { Runtime } from '@cre/sdk'
import { Report } from '@cre/sdk/report'
import { hexToBytes } from '@cre/sdk/utils/hex-utils'
import { coerceMessageInput } from '@cre/sdk/utils/protobuf-input'

/**
 * Client Capability
 *
 * Capability ID: confidential-http@1.0.0-alpha
 * Capability Name: confidential-http
 * Capability Version: 1.0.0-alpha
 */
export class ClientCapability {
	/** The capability ID for this service */
	static readonly CAPABILITY_ID = 'confidential-http@1.0.0-alpha'

	static readonly CAPABILITY_NAME = 'confidential-http'
	static readonly CAPABILITY_VERSION = '1.0.0-alpha'

	sendRequest(
		runtime: Runtime<unknown>,
		input:
			| ConfidentialHTTPRequest
			| ConfidentialHTTPRequestJson
			| MessageInitShape<typeof ConfidentialHTTPRequestSchema>,
	): { result: () => HTTPResponse } {
		// Handle input conversion - unwrap if it's a wrapped type, convert from JSON if needed
		let payload: ConfidentialHTTPRequest

		if ((input as unknown as { $typeName?: string }).$typeName) {
			// It's the original protobuf type
			payload = input as ConfidentialHTTPRequest
		} else {
			// It's a plain object, support both legacy JSON wire format and MessageInitShape
			payload = coerceMessageInput(ConfidentialHTTPRequestSchema, input)
		}

		const capabilityId = ClientCapability.CAPABILITY_ID

		const capabilityResponse = runtime.callCapability<ConfidentialHTTPRequest, HTTPResponse>({
			capabilityId,
			method: 'SendRequest',
			payload,
			inputSchema: ConfidentialHTTPRequestSchema,
			outputSchema: HTTPResponseSchema,
		})

		return {
			result: () => {
				const result = capabilityResponse.result()

				return result
			},
		}
	}
}
