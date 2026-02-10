import { fromJson } from '@bufbuild/protobuf'
import { anyPack, anyUnpack } from '@bufbuild/protobuf/wkt'
import {
	type BalanceAtReply,
	type BalanceAtReplyJson,
	BalanceAtReplySchema,
	type BalanceAtRequest,
	BalanceAtRequestSchema,
	type CallContractReply,
	type CallContractReplyJson,
	CallContractReplySchema,
	type CallContractRequest,
	CallContractRequestSchema,
	type EstimateGasReply,
	type EstimateGasReplyJson,
	EstimateGasReplySchema,
	type EstimateGasRequest,
	EstimateGasRequestSchema,
	type FilterLogsReply,
	type FilterLogsReplyJson,
	FilterLogsReplySchema,
	type FilterLogsRequest,
	FilterLogsRequestSchema,
	type GetTransactionByHashReply,
	type GetTransactionByHashReplyJson,
	GetTransactionByHashReplySchema,
	type GetTransactionByHashRequest,
	GetTransactionByHashRequestSchema,
	type GetTransactionReceiptReply,
	type GetTransactionReceiptReplyJson,
	GetTransactionReceiptReplySchema,
	type GetTransactionReceiptRequest,
	GetTransactionReceiptRequestSchema,
	type HeaderByNumberReply,
	type HeaderByNumberReplyJson,
	HeaderByNumberReplySchema,
	type HeaderByNumberRequest,
	HeaderByNumberRequestSchema,
	type WriteReportReply,
	type WriteReportReplyJson,
	WriteReportReplySchema,
	type WriteReportRequest,
	WriteReportRequestSchema,
} from '@cre/generated/capabilities/blockchain/evm/v1alpha/client_pb'
import {
	__getTestMockInstance,
	__setTestMockInstance,
	registerTestCapability,
} from '../../../../../../testutils/test-runtime'

/**
 * Mock for ClientCapability. Use testInstance() to obtain an instance; do not construct directly.
 * Set per-method properties (e.g. performAction) to define return values. If a method is invoked without a handler set, an error is thrown.
 */
export class ClientCapabilityMock {
	static readonly CAPABILITY_ID = 'evm@1.0.0'

	/** Set to define the return value for CallContract. May return a plain object (CallContractReplyJson) or the message type. */
	callContract?: (input: CallContractRequest) => CallContractReply | CallContractReplyJson

	/** Set to define the return value for FilterLogs. May return a plain object (FilterLogsReplyJson) or the message type. */
	filterLogs?: (input: FilterLogsRequest) => FilterLogsReply | FilterLogsReplyJson

	/** Set to define the return value for BalanceAt. May return a plain object (BalanceAtReplyJson) or the message type. */
	balanceAt?: (input: BalanceAtRequest) => BalanceAtReply | BalanceAtReplyJson

	/** Set to define the return value for EstimateGas. May return a plain object (EstimateGasReplyJson) or the message type. */
	estimateGas?: (input: EstimateGasRequest) => EstimateGasReply | EstimateGasReplyJson

	/** Set to define the return value for GetTransactionByHash. May return a plain object (GetTransactionByHashReplyJson) or the message type. */
	getTransactionByHash?: (
		input: GetTransactionByHashRequest,
	) => GetTransactionByHashReply | GetTransactionByHashReplyJson

	/** Set to define the return value for GetTransactionReceipt. May return a plain object (GetTransactionReceiptReplyJson) or the message type. */
	getTransactionReceipt?: (
		input: GetTransactionReceiptRequest,
	) => GetTransactionReceiptReply | GetTransactionReceiptReplyJson

	/** Set to define the return value for HeaderByNumber. May return a plain object (HeaderByNumberReplyJson) or the message type. */
	headerByNumber?: (input: HeaderByNumberRequest) => HeaderByNumberReply | HeaderByNumberReplyJson

	/** Set to define the return value for WriteReport. May return a plain object (WriteReportReplyJson) or the message type. */
	writeReport?: (input: WriteReportRequest) => WriteReportReply | WriteReportReplyJson

	private constructor(chainSelector: bigint) {
		const self = this
		const qualifiedId = `evm:ChainSelector:${chainSelector}@1.0.0`
		try {
			registerTestCapability(qualifiedId, (req) => {
				switch (req.method) {
					case 'CallContract': {
						const input = anyUnpack(req.payload, CallContractRequestSchema) as CallContractRequest
						const handler = self.callContract
						if (typeof handler !== 'function')
							throw new Error(
								"CallContract: no implementation provided; set the mock's callContract property to define the return value.",
							)
						const raw = handler(input)
						const output =
							raw && typeof (raw as unknown as { $typeName?: string }).$typeName === 'string'
								? (raw as CallContractReply)
								: fromJson(CallContractReplySchema, raw as CallContractReplyJson)
						return {
							response: { case: 'payload', value: anyPack(CallContractReplySchema, output) },
						}
					}
					case 'FilterLogs': {
						const input = anyUnpack(req.payload, FilterLogsRequestSchema) as FilterLogsRequest
						const handler = self.filterLogs
						if (typeof handler !== 'function')
							throw new Error(
								"FilterLogs: no implementation provided; set the mock's filterLogs property to define the return value.",
							)
						const raw = handler(input)
						const output =
							raw && typeof (raw as unknown as { $typeName?: string }).$typeName === 'string'
								? (raw as FilterLogsReply)
								: fromJson(FilterLogsReplySchema, raw as FilterLogsReplyJson)
						return { response: { case: 'payload', value: anyPack(FilterLogsReplySchema, output) } }
					}
					case 'BalanceAt': {
						const input = anyUnpack(req.payload, BalanceAtRequestSchema) as BalanceAtRequest
						const handler = self.balanceAt
						if (typeof handler !== 'function')
							throw new Error(
								"BalanceAt: no implementation provided; set the mock's balanceAt property to define the return value.",
							)
						const raw = handler(input)
						const output =
							raw && typeof (raw as unknown as { $typeName?: string }).$typeName === 'string'
								? (raw as BalanceAtReply)
								: fromJson(BalanceAtReplySchema, raw as BalanceAtReplyJson)
						return { response: { case: 'payload', value: anyPack(BalanceAtReplySchema, output) } }
					}
					case 'EstimateGas': {
						const input = anyUnpack(req.payload, EstimateGasRequestSchema) as EstimateGasRequest
						const handler = self.estimateGas
						if (typeof handler !== 'function')
							throw new Error(
								"EstimateGas: no implementation provided; set the mock's estimateGas property to define the return value.",
							)
						const raw = handler(input)
						const output =
							raw && typeof (raw as unknown as { $typeName?: string }).$typeName === 'string'
								? (raw as EstimateGasReply)
								: fromJson(EstimateGasReplySchema, raw as EstimateGasReplyJson)
						return { response: { case: 'payload', value: anyPack(EstimateGasReplySchema, output) } }
					}
					case 'GetTransactionByHash': {
						const input = anyUnpack(
							req.payload,
							GetTransactionByHashRequestSchema,
						) as GetTransactionByHashRequest
						const handler = self.getTransactionByHash
						if (typeof handler !== 'function')
							throw new Error(
								"GetTransactionByHash: no implementation provided; set the mock's getTransactionByHash property to define the return value.",
							)
						const raw = handler(input)
						const output =
							raw && typeof (raw as unknown as { $typeName?: string }).$typeName === 'string'
								? (raw as GetTransactionByHashReply)
								: fromJson(GetTransactionByHashReplySchema, raw as GetTransactionByHashReplyJson)
						return {
							response: {
								case: 'payload',
								value: anyPack(GetTransactionByHashReplySchema, output),
							},
						}
					}
					case 'GetTransactionReceipt': {
						const input = anyUnpack(
							req.payload,
							GetTransactionReceiptRequestSchema,
						) as GetTransactionReceiptRequest
						const handler = self.getTransactionReceipt
						if (typeof handler !== 'function')
							throw new Error(
								"GetTransactionReceipt: no implementation provided; set the mock's getTransactionReceipt property to define the return value.",
							)
						const raw = handler(input)
						const output =
							raw && typeof (raw as unknown as { $typeName?: string }).$typeName === 'string'
								? (raw as GetTransactionReceiptReply)
								: fromJson(GetTransactionReceiptReplySchema, raw as GetTransactionReceiptReplyJson)
						return {
							response: {
								case: 'payload',
								value: anyPack(GetTransactionReceiptReplySchema, output),
							},
						}
					}
					case 'HeaderByNumber': {
						const input = anyUnpack(
							req.payload,
							HeaderByNumberRequestSchema,
						) as HeaderByNumberRequest
						const handler = self.headerByNumber
						if (typeof handler !== 'function')
							throw new Error(
								"HeaderByNumber: no implementation provided; set the mock's headerByNumber property to define the return value.",
							)
						const raw = handler(input)
						const output =
							raw && typeof (raw as unknown as { $typeName?: string }).$typeName === 'string'
								? (raw as HeaderByNumberReply)
								: fromJson(HeaderByNumberReplySchema, raw as HeaderByNumberReplyJson)
						return {
							response: { case: 'payload', value: anyPack(HeaderByNumberReplySchema, output) },
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
	static testInstance(chainSelector: bigint): ClientCapabilityMock {
		const qualifiedId = `evm:ChainSelector:${chainSelector}@1.0.0`
		let instance = __getTestMockInstance<ClientCapabilityMock>(qualifiedId)
		if (!instance) {
			instance = new ClientCapabilityMock(chainSelector)
			__setTestMockInstance(qualifiedId, instance)
		}
		return instance
	}
}
