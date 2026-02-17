import { fromJson } from '@bufbuild/protobuf'
import { anyPack, anyUnpack } from '@bufbuild/protobuf/wkt'
import {
	type Input,
	InputSchema,
	type Output,
	type OutputJson,
	OutputSchema,
} from '@cre/generated/capabilities/internal/actionandtrigger/v1/action_and_trigger_pb'
import {
	__getTestMockInstance,
	__setTestMockInstance,
	registerTestCapability,
} from '@cre/sdk/testutils/test-runtime'

/**
 * Mock for BasicCapability. Use testInstance() to obtain an instance; do not construct directly.
 * Set per-method properties (e.g. performAction) to define return values. If a method is invoked without a handler set, an error is thrown.
 */
export class BasicTestActionTriggerMock {
	static readonly CAPABILITY_ID = 'basic-test-action-trigger@1.0.0'

	/** Set to define the return value for Action. May return a plain object (OutputJson) or the message type. */
	action?: (input: Input) => Output | OutputJson

	private constructor() {
		const self = this
		const qualifiedId = BasicTestActionTriggerMock.CAPABILITY_ID
		try {
			registerTestCapability(qualifiedId, (req) => {
				switch (req.method) {
					case 'Action': {
						const input = anyUnpack(req.payload, InputSchema) as Input
						const handler = self.action
						if (typeof handler !== 'function')
							throw new Error(
								"Action: no implementation provided; set the mock's action property to define the return value.",
							)
						const raw = handler(input)
						const output =
							raw && typeof (raw as unknown as { $typeName?: string }).$typeName === 'string'
								? (raw as Output)
								: fromJson(OutputSchema, raw as OutputJson)
						return { response: { case: 'payload', value: anyPack(OutputSchema, output) } }
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
	static testInstance(): BasicTestActionTriggerMock {
		const qualifiedId = BasicTestActionTriggerMock.CAPABILITY_ID
		let instance = __getTestMockInstance<BasicTestActionTriggerMock>(qualifiedId)
		if (!instance) {
			instance = new BasicTestActionTriggerMock()
			__setTestMockInstance(qualifiedId, instance)
		}
		return instance
	}
}
