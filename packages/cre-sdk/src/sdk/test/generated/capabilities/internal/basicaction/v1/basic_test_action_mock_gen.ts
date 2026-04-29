import { fromJson } from '@bufbuild/protobuf'
import { anyPack, anyUnpack } from '@bufbuild/protobuf/wkt'
import {
	type Inputs,
	InputsSchema,
	type Outputs,
	type OutputsJson,
	OutputsSchema,
} from '@cre/generated/capabilities/internal/basicaction/v1/basic_action_pb'
import {
	__getTestMockInstance,
	__setTestMockInstance,
	registerTestCapability,
} from '@cre/sdk/testutils/test-runtime'

/**
 * Mock for BasicActionCapability. Use testInstance() to obtain an instance; do not construct directly.
 * Set per-method properties (e.g. performAction) to define return values. If a method is invoked without a handler set, an error is thrown.
 */
export class BasicTestActionMock {
	static readonly CAPABILITY_ID = 'basic-test-action@1.0.0'

	/** Set to define the return value for PerformAction. May return a plain object (OutputsJson) or the message type. */
	performAction?: (input: Inputs) => Outputs | OutputsJson

	private constructor() {
		const self = this
		const qualifiedId = BasicTestActionMock.CAPABILITY_ID
		try {
			registerTestCapability(qualifiedId, (req) => {
				switch (req.method) {
					case 'PerformAction': {
						const input = anyUnpack(req.payload, InputsSchema) as Inputs
						const handler = self.performAction
						if (typeof handler !== 'function')
							throw new Error(
								"PerformAction: no implementation provided; set the mock's performAction property to define the return value.",
							)
						const raw = handler(input)
						const output =
							raw && typeof (raw as unknown as { $typeName?: string }).$typeName === 'string'
								? (raw as Outputs)
								: fromJson(OutputsSchema, raw as OutputsJson)
						return { response: { case: 'payload', value: anyPack(OutputsSchema, output) } }
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
	static testInstance(): BasicTestActionMock {
		const qualifiedId = BasicTestActionMock.CAPABILITY_ID
		let instance = __getTestMockInstance<BasicTestActionMock>(qualifiedId)
		if (!instance) {
			instance = new BasicTestActionMock()
			__setTestMockInstance(qualifiedId, instance)
		}
		return instance
	}
}
