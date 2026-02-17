import { fromJson } from '@bufbuild/protobuf'
import { anyPack, anyUnpack } from '@bufbuild/protobuf/wkt'
import {
	type ConfidentialHTTPRequest,
	ConfidentialHTTPRequestSchema,
	type HTTPResponse,
	type HTTPResponseJson,
	HTTPResponseSchema,
} from '@cre/generated/capabilities/networking/confidentialhttp/v1alpha/client_pb'
import {
	__getTestMockInstance,
	__setTestMockInstance,
	registerTestCapability,
} from '../../../../../../testutils/test-runtime'

/**
 * Mock for ClientCapability. Use testInstance() to obtain an instance; do not construct directly.
 * Set per-method properties (e.g. performAction) to define return values. If a method is invoked without a handler set, an error is thrown.
 */
export class ConfidentialHttpMock {
	static readonly CAPABILITY_ID = 'confidential-http@1.0.0-alpha'

	/** Set to define the return value for SendRequest. May return a plain object (HTTPResponseJson) or the message type. */
	sendRequest?: (input: ConfidentialHTTPRequest) => HTTPResponse | HTTPResponseJson

	private constructor() {
		const self = this
		const qualifiedId = ConfidentialHttpMock.CAPABILITY_ID
		try {
			registerTestCapability(qualifiedId, (req) => {
				switch (req.method) {
					case 'SendRequest': {
						const input = anyUnpack(
							req.payload,
							ConfidentialHTTPRequestSchema,
						) as ConfidentialHTTPRequest
						const handler = self.sendRequest
						if (typeof handler !== 'function')
							throw new Error(
								"SendRequest: no implementation provided; set the mock's sendRequest property to define the return value.",
							)
						const raw = handler(input)
						const output =
							raw && typeof (raw as unknown as { $typeName?: string }).$typeName === 'string'
								? (raw as HTTPResponse)
								: fromJson(HTTPResponseSchema, raw as HTTPResponseJson)
						return { response: { case: 'payload', value: anyPack(HTTPResponseSchema, output) } }
					}
					default:
						return { response: { case: 'error', value: `unknown method ${req.method}` } }
				}
			})
		} catch {
			throw new Error(
				"Capability mocks must be used within the CRE test framework's test() method.",
			)
		}
	}

	/**
	 * Returns the mock instance for this capability.
	 * Multiple calls with the same arguments return the same instance.
	 * Must be called within the test framework's test() method.
	 */
	static testInstance(): ConfidentialHttpMock {
		const qualifiedId = ConfidentialHttpMock.CAPABILITY_ID
		let instance = __getTestMockInstance<ConfidentialHttpMock>(qualifiedId)
		if (!instance) {
			instance = new ConfidentialHttpMock()
			__setTestMockInstance(qualifiedId, instance)
		}
		return instance
	}
}
