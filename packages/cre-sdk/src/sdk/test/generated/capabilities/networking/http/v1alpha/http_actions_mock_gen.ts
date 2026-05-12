import { fromJson } from '@bufbuild/protobuf'
import { anyPack, anyUnpack } from '@bufbuild/protobuf/wkt'
import {
	type Request,
	RequestSchema,
	type Response,
	type ResponseJson,
	ResponseSchema,
} from '@cre/generated/capabilities/networking/http/v1alpha/client_pb'
import {
	__getTestMockInstance,
	__setTestMockInstance,
	registerTestCapability,
} from '@cre/sdk/testutils/test-runtime'

/**
 * Mock for ClientCapability. Use testInstance() to obtain an instance; do not construct directly.
 * Set per-method properties (e.g. performAction) to define return values. If a method is invoked without a handler set, an error is thrown.
 */
export class HttpActionsMock {
	static readonly CAPABILITY_ID = 'http-actions@1.0.0-alpha'

	/** Set to define the return value for SendRequest. May return a plain object (ResponseJson) or the message type. */
	sendRequest?: (input: Request) => Response | ResponseJson

	private constructor() {
		const self = this
		const qualifiedId = HttpActionsMock.CAPABILITY_ID
		try {
			registerTestCapability(qualifiedId, (req) => {
				switch (req.method) {
					case 'SendRequest': {
						const input = anyUnpack(req.payload, RequestSchema) as Request
						const handler = self.sendRequest
						if (typeof handler !== 'function')
							throw new Error(
								"SendRequest: no implementation provided; set the mock's sendRequest property to define the return value.",
							)
						const raw = handler(input)
						const output =
							raw && typeof (raw as unknown as { $typeName?: string }).$typeName === 'string'
								? (raw as Response)
								: fromJson(ResponseSchema, raw as ResponseJson)
						return { response: { case: 'payload', value: anyPack(ResponseSchema, output) } }
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
	static testInstance(): HttpActionsMock {
		const qualifiedId = HttpActionsMock.CAPABILITY_ID
		let instance = __getTestMockInstance<HttpActionsMock>(qualifiedId)
		if (!instance) {
			instance = new HttpActionsMock()
			__setTestMockInstance(qualifiedId, instance)
		}
		return instance
	}
}
