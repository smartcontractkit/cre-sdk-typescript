import { fromJson } from '@bufbuild/protobuf'
import { anyPack, anyUnpack } from '@bufbuild/protobuf/wkt'
import {
	registerTestCapability,
	__getTestMockInstance,
	__setTestMockInstance,
} from '@cre/sdk/testutils/test-runtime'
import {
	type AccountAPTBalanceReply,
	type AccountAPTBalanceReplyJson,
	AccountAPTBalanceReplySchema,
	type AccountAPTBalanceRequest,
	AccountAPTBalanceRequestSchema,
	type AccountTransactionsReply,
	type AccountTransactionsReplyJson,
	AccountTransactionsReplySchema,
	type AccountTransactionsRequest,
	AccountTransactionsRequestSchema,
	type TransactionByHashReply,
	type TransactionByHashReplyJson,
	TransactionByHashReplySchema,
	type TransactionByHashRequest,
	TransactionByHashRequestSchema,
	type ViewReply,
	type ViewReplyJson,
	ViewReplySchema,
	type ViewRequest,
	ViewRequestSchema,
	type WriteReportReply,
	type WriteReportReplyJson,
	WriteReportReplySchema,
	type WriteReportRequest,
	WriteReportRequestSchema,
} from '@cre/generated/capabilities/blockchain/aptos/v1alpha/client_pb'

/**
 * Mock for ClientCapability. Use testInstance() to obtain an instance; do not construct directly.
 * Set per-method properties (e.g. performAction) to define return values. If a method is invoked without a handler set, an error is thrown.
 */
export class AptosMock {
	static readonly CAPABILITY_ID = 'aptos@1.0.0'

	/** Set to define the return value for AccountAPTBalance. May return a plain object (AccountAPTBalanceReplyJson) or the message type. */
	accountAPTBalance?: (
		input: AccountAPTBalanceRequest,
	) => AccountAPTBalanceReply | AccountAPTBalanceReplyJson

	/** Set to define the return value for View. May return a plain object (ViewReplyJson) or the message type. */
	view?: (input: ViewRequest) => ViewReply | ViewReplyJson

	/** Set to define the return value for TransactionByHash. May return a plain object (TransactionByHashReplyJson) or the message type. */
	transactionByHash?: (
		input: TransactionByHashRequest,
	) => TransactionByHashReply | TransactionByHashReplyJson

	/** Set to define the return value for AccountTransactions. May return a plain object (AccountTransactionsReplyJson) or the message type. */
	accountTransactions?: (
		input: AccountTransactionsRequest,
	) => AccountTransactionsReply | AccountTransactionsReplyJson

	/** Set to define the return value for WriteReport. May return a plain object (WriteReportReplyJson) or the message type. */
	writeReport?: (input: WriteReportRequest) => WriteReportReply | WriteReportReplyJson

	private constructor(chainSelector: bigint) {
		const self = this
		const qualifiedId = `aptos:ChainSelector:${chainSelector}@1.0.0`
		try {
			registerTestCapability(qualifiedId, (req) => {
				switch (req.method) {
					case 'AccountAPTBalance': {
						const input = anyUnpack(
							req.payload,
							AccountAPTBalanceRequestSchema,
						) as AccountAPTBalanceRequest
						const handler = self.accountAPTBalance
						if (typeof handler !== 'function')
							throw new Error(
								"AccountAPTBalance: no implementation provided; set the mock's accountAPTBalance property to define the return value.",
							)
						const raw = handler(input)
						const output =
							raw && typeof (raw as unknown as { $typeName?: string }).$typeName === 'string'
								? (raw as AccountAPTBalanceReply)
								: fromJson(AccountAPTBalanceReplySchema, raw as AccountAPTBalanceReplyJson)
						return {
							response: { case: 'payload', value: anyPack(AccountAPTBalanceReplySchema, output) },
						}
					}
					case 'View': {
						const input = anyUnpack(req.payload, ViewRequestSchema) as ViewRequest
						const handler = self.view
						if (typeof handler !== 'function')
							throw new Error(
								"View: no implementation provided; set the mock's view property to define the return value.",
							)
						const raw = handler(input)
						const output =
							raw && typeof (raw as unknown as { $typeName?: string }).$typeName === 'string'
								? (raw as ViewReply)
								: fromJson(ViewReplySchema, raw as ViewReplyJson)
						return { response: { case: 'payload', value: anyPack(ViewReplySchema, output) } }
					}
					case 'TransactionByHash': {
						const input = anyUnpack(
							req.payload,
							TransactionByHashRequestSchema,
						) as TransactionByHashRequest
						const handler = self.transactionByHash
						if (typeof handler !== 'function')
							throw new Error(
								"TransactionByHash: no implementation provided; set the mock's transactionByHash property to define the return value.",
							)
						const raw = handler(input)
						const output =
							raw && typeof (raw as unknown as { $typeName?: string }).$typeName === 'string'
								? (raw as TransactionByHashReply)
								: fromJson(TransactionByHashReplySchema, raw as TransactionByHashReplyJson)
						return {
							response: { case: 'payload', value: anyPack(TransactionByHashReplySchema, output) },
						}
					}
					case 'AccountTransactions': {
						const input = anyUnpack(
							req.payload,
							AccountTransactionsRequestSchema,
						) as AccountTransactionsRequest
						const handler = self.accountTransactions
						if (typeof handler !== 'function')
							throw new Error(
								"AccountTransactions: no implementation provided; set the mock's accountTransactions property to define the return value.",
							)
						const raw = handler(input)
						const output =
							raw && typeof (raw as unknown as { $typeName?: string }).$typeName === 'string'
								? (raw as AccountTransactionsReply)
								: fromJson(AccountTransactionsReplySchema, raw as AccountTransactionsReplyJson)
						return {
							response: { case: 'payload', value: anyPack(AccountTransactionsReplySchema, output) },
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
	static testInstance(chainSelector: bigint): AptosMock {
		const qualifiedId = `aptos:ChainSelector:${chainSelector}@1.0.0`
		let instance = __getTestMockInstance<AptosMock>(qualifiedId)
		if (!instance) {
			instance = new AptosMock(chainSelector)
			__setTestMockInstance(qualifiedId, instance)
		}
		return instance
	}
}
