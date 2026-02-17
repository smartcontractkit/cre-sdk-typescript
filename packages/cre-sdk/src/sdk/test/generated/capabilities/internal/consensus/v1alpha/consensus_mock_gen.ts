import { fromJson } from '@bufbuild/protobuf'
import { anyPack, anyUnpack } from '@bufbuild/protobuf/wkt'
import {
	type ReportRequest,
	ReportRequestSchema,
	type ReportResponse,
	type ReportResponseJson,
	ReportResponseSchema,
	type SimpleConsensusInputs,
	SimpleConsensusInputsSchema,
} from '@cre/generated/sdk/v1alpha/sdk_pb'
import { type Value, type ValueJson, ValueSchema } from '@cre/generated/values/v1/values_pb'
import {
	__getTestMockInstance,
	__setTestMockInstance,
	registerTestCapability,
} from '../../../../../../testutils/test-runtime'

/**
 * Mock for ConsensusCapability. Use testInstance() to obtain an instance; do not construct directly.
 * Set per-method properties (e.g. performAction) to define return values. If a method is invoked without a handler set, an error is thrown.
 */
export class ConsensusMock {
	static readonly CAPABILITY_ID = 'consensus@1.0.0-alpha'

	/** Set to define the return value for Simple. May return a plain object (ValueJson) or the message type. */
	simple?: (input: SimpleConsensusInputs) => Value | ValueJson

	/** Set to define the return value for Report. May return a plain object (ReportResponseJson) or the message type. */
	report?: (input: ReportRequest) => ReportResponse | ReportResponseJson

	private constructor() {
		const self = this
		const qualifiedId = ConsensusMock.CAPABILITY_ID
		try {
			registerTestCapability(qualifiedId, (req) => {
				switch (req.method) {
					case 'Simple': {
						const input = anyUnpack(
							req.payload,
							SimpleConsensusInputsSchema,
						) as SimpleConsensusInputs
						const handler = self.simple
						if (typeof handler !== 'function')
							throw new Error(
								"Simple: no implementation provided; set the mock's simple property to define the return value.",
							)
						const raw = handler(input)
						const output =
							raw && typeof (raw as unknown as { $typeName?: string }).$typeName === 'string'
								? (raw as Value)
								: fromJson(ValueSchema, raw as ValueJson)
						return { response: { case: 'payload', value: anyPack(ValueSchema, output) } }
					}
					case 'Report': {
						const input = anyUnpack(req.payload, ReportRequestSchema) as ReportRequest
						const handler = self.report
						if (typeof handler !== 'function')
							throw new Error(
								"Report: no implementation provided; set the mock's report property to define the return value.",
							)
						const raw = handler(input)
						const output =
							raw && typeof (raw as unknown as { $typeName?: string }).$typeName === 'string'
								? (raw as ReportResponse)
								: fromJson(ReportResponseSchema, raw as ReportResponseJson)
						return { response: { case: 'payload', value: anyPack(ReportResponseSchema, output) } }
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
	static testInstance(): ConsensusMock {
		const qualifiedId = ConsensusMock.CAPABILITY_ID
		let instance = __getTestMockInstance<ConsensusMock>(qualifiedId)
		if (!instance) {
			instance = new ConsensusMock()
			__setTestMockInstance(qualifiedId, instance)
		}
		return instance
	}
}
