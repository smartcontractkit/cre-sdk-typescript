import { fromJson } from '@bufbuild/protobuf'
import { anyPack, anyUnpack } from '@bufbuild/protobuf/wkt'
import {
	type WriteReportReply,
	type WriteReportReplyJson,
	WriteReportReplySchema,
	type WriteReportRequest,
	WriteReportRequestSchema,
} from '@cre/generated/capabilities/blockchain/solana/v1alpha/client_pb'
import {
	__getTestMockInstance,
	__setTestMockInstance,
	registerTestCapability,
} from '@cre/sdk/testutils/test-runtime'

/**
 * Mock for ClientCapability. Use testInstance() to obtain an instance; do not construct directly.
 * Set per-method properties (e.g. performAction) to define return values. If a method is invoked without a handler set, an error is thrown.
 */
export class SolanaMock {
	static readonly CAPABILITY_ID = 'solana@1.0.0'

	/** Set to define the return value for WriteReport. May return a plain object (WriteReportReplyJson) or the message type. */
	writeReport?: (input: WriteReportRequest) => WriteReportReply | WriteReportReplyJson

	private constructor(chainSelector: bigint) {
		const self = this
		const qualifiedId = `solana:ChainSelector:${chainSelector}@1.0.0`
		try {
			registerTestCapability(qualifiedId, (req) => {
				switch (req.method) {
					case 'WriteReport': {
						const input = anyUnpack(req.payload, WriteReportRequestSchema) as WriteReportRequest
						const handler = self.writeReport
						if (typeof handler !== 'function')
							throw new Error(
								"WriteReport: no implementation provided; set the mock's writeReport property to define the return value.",
							)
						const raw = handler(input)
						const output =
							raw && typeof (raw as unknown as { $typeName?: string }).$typeName === 'string'
								? (raw as WriteReportReply)
								: fromJson(WriteReportReplySchema, raw as WriteReportReplyJson)
						return { response: { case: 'payload', value: anyPack(WriteReportReplySchema, output) } }
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
	 * Returns the mock instance for this capability and the specified tags.
	 * Multiple calls with the same tag values return the same instance.
	 * Must be called within the test framework's test() method.
	 */
	static testInstance(chainSelector: bigint): SolanaMock {
		const qualifiedId = `solana:ChainSelector:${chainSelector}@1.0.0`
		let instance = __getTestMockInstance<SolanaMock>(qualifiedId)
		if (!instance) {
			instance = new SolanaMock(chainSelector)
			__setTestMockInstance(qualifiedId, instance)
		}
		return instance
	}
}
