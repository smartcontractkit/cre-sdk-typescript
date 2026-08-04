import { fromJson } from '@bufbuild/protobuf'
import { anyPack, anyUnpack } from '@bufbuild/protobuf/wkt'
import {
	type GetLatestLedgerRequest,
	GetLatestLedgerRequestSchema,
	type GetLatestLedgerResponse,
	type GetLatestLedgerResponseJson,
	GetLatestLedgerResponseSchema,
	type ReadContractRequest,
	ReadContractRequestSchema,
	type ReadContractResponse,
	type ReadContractResponseJson,
	ReadContractResponseSchema,
	type WriteReportReply,
	type WriteReportReplyJson,
	WriteReportReplySchema,
	type WriteReportRequest,
	WriteReportRequestSchema,
} from '@cre/generated/capabilities/blockchain/stellar/v1alpha/client_pb'
import {
	__getTestMockInstance,
	__setTestMockInstance,
	registerTestCapability,
} from '@cre/sdk/testutils/test-runtime'

/**
 * Mock for ClientCapability. Use testInstance() to obtain an instance; do not construct directly.
 * Set per-method properties (e.g. performAction) to define return values. If a method is invoked without a handler set, an error is thrown.
 */
export class StellarMock {
	static readonly CAPABILITY_ID = 'stellar@1.0.0'

	/** Set to define the return value for GetLatestLedger. May return a plain object (GetLatestLedgerResponseJson) or the message type. */
	getLatestLedger?: (
		input: GetLatestLedgerRequest,
	) => GetLatestLedgerResponse | GetLatestLedgerResponseJson

	/** Set to define the return value for ReadContract. May return a plain object (ReadContractResponseJson) or the message type. */
	readContract?: (input: ReadContractRequest) => ReadContractResponse | ReadContractResponseJson

	/** Set to define the return value for WriteReport. May return a plain object (WriteReportReplyJson) or the message type. */
	writeReport?: (input: WriteReportRequest) => WriteReportReply | WriteReportReplyJson

	private constructor(chainSelector: bigint) {
		const self = this
		const qualifiedId = `stellar:ChainSelector:${chainSelector}@1.0.0`
		try {
			registerTestCapability(qualifiedId, (req) => {
				switch (req.method) {
					case 'GetLatestLedger': {
						const input = anyUnpack(
							req.payload,
							GetLatestLedgerRequestSchema,
						) as GetLatestLedgerRequest
						const handler = self.getLatestLedger
						if (typeof handler !== 'function')
							throw new Error(
								"GetLatestLedger: no implementation provided; set the mock's getLatestLedger property to define the return value.",
							)
						const raw = handler(input)
						const output =
							raw && typeof (raw as unknown as { $typeName?: string }).$typeName === 'string'
								? (raw as GetLatestLedgerResponse)
								: fromJson(GetLatestLedgerResponseSchema, raw as GetLatestLedgerResponseJson)
						return {
							response: { case: 'payload', value: anyPack(GetLatestLedgerResponseSchema, output) },
						}
					}
					case 'ReadContract': {
						const input = anyUnpack(req.payload, ReadContractRequestSchema) as ReadContractRequest
						const handler = self.readContract
						if (typeof handler !== 'function')
							throw new Error(
								"ReadContract: no implementation provided; set the mock's readContract property to define the return value.",
							)
						const raw = handler(input)
						const output =
							raw && typeof (raw as unknown as { $typeName?: string }).$typeName === 'string'
								? (raw as ReadContractResponse)
								: fromJson(ReadContractResponseSchema, raw as ReadContractResponseJson)
						return {
							response: { case: 'payload', value: anyPack(ReadContractResponseSchema, output) },
						}
					}
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
	static testInstance(chainSelector: bigint): StellarMock {
		const qualifiedId = `stellar:ChainSelector:${chainSelector}@1.0.0`
		let instance = __getTestMockInstance<StellarMock>(qualifiedId)
		if (!instance) {
			instance = new StellarMock(chainSelector)
			__setTestMockInstance(qualifiedId, instance)
		}
		return instance
	}
}
