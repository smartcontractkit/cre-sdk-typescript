import { fromJson } from '@bufbuild/protobuf'
import { anyPack, anyUnpack } from '@bufbuild/protobuf/wkt'
import {
	type GetAccountInfoWithOptsReply,
	type GetAccountInfoWithOptsReplyJson,
	GetAccountInfoWithOptsReplySchema,
	type GetAccountInfoWithOptsRequest,
	GetAccountInfoWithOptsRequestSchema,
	type GetBalanceReply,
	type GetBalanceReplyJson,
	GetBalanceReplySchema,
	type GetBalanceRequest,
	GetBalanceRequestSchema,
	type GetBlockReply,
	type GetBlockReplyJson,
	GetBlockReplySchema,
	type GetBlockRequest,
	GetBlockRequestSchema,
	type GetFeeForMessageReply,
	type GetFeeForMessageReplyJson,
	GetFeeForMessageReplySchema,
	type GetFeeForMessageRequest,
	GetFeeForMessageRequestSchema,
	type GetMultipleAccountsWithOptsReply,
	type GetMultipleAccountsWithOptsReplyJson,
	GetMultipleAccountsWithOptsReplySchema,
	type GetMultipleAccountsWithOptsRequest,
	GetMultipleAccountsWithOptsRequestSchema,
	type GetSignatureStatusesReply,
	type GetSignatureStatusesReplyJson,
	GetSignatureStatusesReplySchema,
	type GetSignatureStatusesRequest,
	GetSignatureStatusesRequestSchema,
	type GetSlotHeightReply,
	type GetSlotHeightReplyJson,
	GetSlotHeightReplySchema,
	type GetSlotHeightRequest,
	GetSlotHeightRequestSchema,
	type GetTransactionReply,
	type GetTransactionReplyJson,
	GetTransactionReplySchema,
	type GetTransactionRequest,
	GetTransactionRequestSchema,
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

	/** Set to define the return value for GetAccountInfoWithOpts. May return a plain object (GetAccountInfoWithOptsReplyJson) or the message type. */
	getAccountInfoWithOpts?: (
		input: GetAccountInfoWithOptsRequest,
	) => GetAccountInfoWithOptsReply | GetAccountInfoWithOptsReplyJson

	/** Set to define the return value for GetBalance. May return a plain object (GetBalanceReplyJson) or the message type. */
	getBalance?: (input: GetBalanceRequest) => GetBalanceReply | GetBalanceReplyJson

	/** Set to define the return value for GetBlock. May return a plain object (GetBlockReplyJson) or the message type. */
	getBlock?: (input: GetBlockRequest) => GetBlockReply | GetBlockReplyJson

	/** Set to define the return value for GetFeeForMessage. May return a plain object (GetFeeForMessageReplyJson) or the message type. */
	getFeeForMessage?: (
		input: GetFeeForMessageRequest,
	) => GetFeeForMessageReply | GetFeeForMessageReplyJson

	/** Set to define the return value for GetMultipleAccountsWithOpts. May return a plain object (GetMultipleAccountsWithOptsReplyJson) or the message type. */
	getMultipleAccountsWithOpts?: (
		input: GetMultipleAccountsWithOptsRequest,
	) => GetMultipleAccountsWithOptsReply | GetMultipleAccountsWithOptsReplyJson

	/** Set to define the return value for GetSignatureStatuses. May return a plain object (GetSignatureStatusesReplyJson) or the message type. */
	getSignatureStatuses?: (
		input: GetSignatureStatusesRequest,
	) => GetSignatureStatusesReply | GetSignatureStatusesReplyJson

	/** Set to define the return value for GetSlotHeight. May return a plain object (GetSlotHeightReplyJson) or the message type. */
	getSlotHeight?: (input: GetSlotHeightRequest) => GetSlotHeightReply | GetSlotHeightReplyJson

	/** Set to define the return value for GetTransaction. May return a plain object (GetTransactionReplyJson) or the message type. */
	getTransaction?: (input: GetTransactionRequest) => GetTransactionReply | GetTransactionReplyJson

	/** Set to define the return value for WriteReport. May return a plain object (WriteReportReplyJson) or the message type. */
	writeReport?: (input: WriteReportRequest) => WriteReportReply | WriteReportReplyJson

	private constructor(chainSelector: bigint) {
		const self = this
		const qualifiedId = `solana:ChainSelector:${chainSelector}@1.0.0`
		try {
			registerTestCapability(qualifiedId, (req) => {
				switch (req.method) {
					case 'GetAccountInfoWithOpts': {
						const input = anyUnpack(
							req.payload,
							GetAccountInfoWithOptsRequestSchema,
						) as GetAccountInfoWithOptsRequest
						const handler = self.getAccountInfoWithOpts
						if (typeof handler !== 'function')
							throw new Error(
								"GetAccountInfoWithOpts: no implementation provided; set the mock's getAccountInfoWithOpts property to define the return value.",
							)
						const raw = handler(input)
						const output =
							raw && typeof (raw as unknown as { $typeName?: string }).$typeName === 'string'
								? (raw as GetAccountInfoWithOptsReply)
								: fromJson(
										GetAccountInfoWithOptsReplySchema,
										raw as GetAccountInfoWithOptsReplyJson,
									)
						return {
							response: {
								case: 'payload',
								value: anyPack(GetAccountInfoWithOptsReplySchema, output),
							},
						}
					}
					case 'GetBalance': {
						const input = anyUnpack(req.payload, GetBalanceRequestSchema) as GetBalanceRequest
						const handler = self.getBalance
						if (typeof handler !== 'function')
							throw new Error(
								"GetBalance: no implementation provided; set the mock's getBalance property to define the return value.",
							)
						const raw = handler(input)
						const output =
							raw && typeof (raw as unknown as { $typeName?: string }).$typeName === 'string'
								? (raw as GetBalanceReply)
								: fromJson(GetBalanceReplySchema, raw as GetBalanceReplyJson)
						return { response: { case: 'payload', value: anyPack(GetBalanceReplySchema, output) } }
					}
					case 'GetBlock': {
						const input = anyUnpack(req.payload, GetBlockRequestSchema) as GetBlockRequest
						const handler = self.getBlock
						if (typeof handler !== 'function')
							throw new Error(
								"GetBlock: no implementation provided; set the mock's getBlock property to define the return value.",
							)
						const raw = handler(input)
						const output =
							raw && typeof (raw as unknown as { $typeName?: string }).$typeName === 'string'
								? (raw as GetBlockReply)
								: fromJson(GetBlockReplySchema, raw as GetBlockReplyJson)
						return { response: { case: 'payload', value: anyPack(GetBlockReplySchema, output) } }
					}
					case 'GetFeeForMessage': {
						const input = anyUnpack(
							req.payload,
							GetFeeForMessageRequestSchema,
						) as GetFeeForMessageRequest
						const handler = self.getFeeForMessage
						if (typeof handler !== 'function')
							throw new Error(
								"GetFeeForMessage: no implementation provided; set the mock's getFeeForMessage property to define the return value.",
							)
						const raw = handler(input)
						const output =
							raw && typeof (raw as unknown as { $typeName?: string }).$typeName === 'string'
								? (raw as GetFeeForMessageReply)
								: fromJson(GetFeeForMessageReplySchema, raw as GetFeeForMessageReplyJson)
						return {
							response: { case: 'payload', value: anyPack(GetFeeForMessageReplySchema, output) },
						}
					}
					case 'GetMultipleAccountsWithOpts': {
						const input = anyUnpack(
							req.payload,
							GetMultipleAccountsWithOptsRequestSchema,
						) as GetMultipleAccountsWithOptsRequest
						const handler = self.getMultipleAccountsWithOpts
						if (typeof handler !== 'function')
							throw new Error(
								"GetMultipleAccountsWithOpts: no implementation provided; set the mock's getMultipleAccountsWithOpts property to define the return value.",
							)
						const raw = handler(input)
						const output =
							raw && typeof (raw as unknown as { $typeName?: string }).$typeName === 'string'
								? (raw as GetMultipleAccountsWithOptsReply)
								: fromJson(
										GetMultipleAccountsWithOptsReplySchema,
										raw as GetMultipleAccountsWithOptsReplyJson,
									)
						return {
							response: {
								case: 'payload',
								value: anyPack(GetMultipleAccountsWithOptsReplySchema, output),
							},
						}
					}
					case 'GetSignatureStatuses': {
						const input = anyUnpack(
							req.payload,
							GetSignatureStatusesRequestSchema,
						) as GetSignatureStatusesRequest
						const handler = self.getSignatureStatuses
						if (typeof handler !== 'function')
							throw new Error(
								"GetSignatureStatuses: no implementation provided; set the mock's getSignatureStatuses property to define the return value.",
							)
						const raw = handler(input)
						const output =
							raw && typeof (raw as unknown as { $typeName?: string }).$typeName === 'string'
								? (raw as GetSignatureStatusesReply)
								: fromJson(GetSignatureStatusesReplySchema, raw as GetSignatureStatusesReplyJson)
						return {
							response: {
								case: 'payload',
								value: anyPack(GetSignatureStatusesReplySchema, output),
							},
						}
					}
					case 'GetSlotHeight': {
						const input = anyUnpack(req.payload, GetSlotHeightRequestSchema) as GetSlotHeightRequest
						const handler = self.getSlotHeight
						if (typeof handler !== 'function')
							throw new Error(
								"GetSlotHeight: no implementation provided; set the mock's getSlotHeight property to define the return value.",
							)
						const raw = handler(input)
						const output =
							raw && typeof (raw as unknown as { $typeName?: string }).$typeName === 'string'
								? (raw as GetSlotHeightReply)
								: fromJson(GetSlotHeightReplySchema, raw as GetSlotHeightReplyJson)
						return {
							response: { case: 'payload', value: anyPack(GetSlotHeightReplySchema, output) },
						}
					}
					case 'GetTransaction': {
						const input = anyUnpack(
							req.payload,
							GetTransactionRequestSchema,
						) as GetTransactionRequest
						const handler = self.getTransaction
						if (typeof handler !== 'function')
							throw new Error(
								"GetTransaction: no implementation provided; set the mock's getTransaction property to define the return value.",
							)
						const raw = handler(input)
						const output =
							raw && typeof (raw as unknown as { $typeName?: string }).$typeName === 'string'
								? (raw as GetTransactionReply)
								: fromJson(GetTransactionReplySchema, raw as GetTransactionReplyJson)
						return {
							response: { case: 'payload', value: anyPack(GetTransactionReplySchema, output) },
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
