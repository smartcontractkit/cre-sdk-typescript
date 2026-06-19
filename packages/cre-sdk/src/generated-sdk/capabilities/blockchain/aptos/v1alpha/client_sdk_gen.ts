import { create, fromJson } from '@bufbuild/protobuf'
import {
	type AccountAPTBalanceReply,
	AccountAPTBalanceReplySchema,
	type AccountAPTBalanceRequest,
	type AccountAPTBalanceRequestJson,
	AccountAPTBalanceRequestSchema,
	type AccountTransactionsReply,
	AccountTransactionsReplySchema,
	type AccountTransactionsRequest,
	type AccountTransactionsRequestJson,
	AccountTransactionsRequestSchema,
	type GasConfig,
	type GasConfigJson,
	GasConfigSchema,
	type TransactionByHashReply,
	TransactionByHashReplySchema,
	type TransactionByHashRequest,
	type TransactionByHashRequestJson,
	TransactionByHashRequestSchema,
	type ViewReply,
	ViewReplySchema,
	type ViewRequest,
	type ViewRequestJson,
	ViewRequestSchema,
	type WriteReportReply,
	WriteReportReplySchema,
	type WriteReportRequest,
	type WriteReportRequestJson,
	WriteReportRequestSchema,
} from '@cre/generated/capabilities/blockchain/aptos/v1alpha/client_pb'
import {
	type ReportResponse,
	type ReportResponseJson,
	ReportResponseSchema,
} from '@cre/generated/sdk/v1alpha/sdk_pb'
import type { Runtime } from '@cre/sdk'
import { Report } from '@cre/sdk/report'
import { hexToBytes } from '@cre/sdk/utils/hex-utils'

export type WriteCreReportRequest = {
	receiver: Uint8Array
	gasConfig?: GasConfig
	report?: Report
	$report: true
}

export type WriteCreReportRequestJson = {
	receiver: string
	gasConfig?: GasConfigJson
	report?: Report
}

export function x_generatedCodeOnly_wrap_WriteCreReportRequest(
	input: WriteReportRequest,
): WriteCreReportRequest {
	return {
		receiver: input.receiver,
		gasConfig: input.gasConfig,
		report: input.report !== undefined ? new Report(input.report) : undefined,
		$report: true,
	}
}

export function createWriteCreReportRequest(
	input: WriteCreReportRequestJson,
): WriteCreReportRequest {
	return {
		receiver: hexToBytes(input.receiver),
		gasConfig:
			input.gasConfig !== undefined ? fromJson(GasConfigSchema, input.gasConfig) : undefined,
		report: input.report,
		$report: true,
	}
}

export function x_generatedCodeOnly_unwrap_WriteCreReportRequest(
	input: WriteCreReportRequest,
): WriteReportRequest {
	return create(WriteReportRequestSchema, {
		receiver: input.receiver,
		gasConfig: input.gasConfig,
		report: input.report !== undefined ? input.report.x_generatedCodeOnly_unwrap() : undefined,
	})
}

/**
 * Client Capability
 *
 * Capability ID: aptos@1.0.0
 * Capability Name: aptos
 * Capability Version: 1.0.0
 */
export class ClientCapability {
	/** The capability ID for this service */
	static readonly CAPABILITY_ID = 'aptos@1.0.0'

	static readonly CAPABILITY_NAME = 'aptos'
	static readonly CAPABILITY_VERSION = '1.0.0'

	/** Available ChainSelector values */
	static readonly SUPPORTED_CHAIN_SELECTORS = {
		'aptos-mainnet': 4741433654826277614n,
		'aptos-testnet': 743186221051783445n,
	} as const

	constructor(private readonly ChainSelector: bigint) {}

	accountAPTBalance(
		runtime: Runtime<unknown>,
		input: AccountAPTBalanceRequest | AccountAPTBalanceRequestJson,
	): { result: () => AccountAPTBalanceReply } {
		// Handle input conversion - unwrap if it's a wrapped type, convert from JSON if needed
		let payload: AccountAPTBalanceRequest

		if ((input as unknown as { $typeName?: string }).$typeName) {
			// It's the original protobuf type
			payload = input as AccountAPTBalanceRequest
		} else {
			// It's regular JSON, convert using fromJson
			payload = fromJson(AccountAPTBalanceRequestSchema, input as AccountAPTBalanceRequestJson)
		}

		// Include all labels in capability ID for routing when specified
		const capabilityId = `${ClientCapability.CAPABILITY_NAME}:ChainSelector:${this.ChainSelector}@${ClientCapability.CAPABILITY_VERSION}`

		const capabilityResponse = runtime.callCapability<
			AccountAPTBalanceRequest,
			AccountAPTBalanceReply
		>({
			capabilityId,
			method: 'AccountAPTBalance',
			payload,
			inputSchema: AccountAPTBalanceRequestSchema,
			outputSchema: AccountAPTBalanceReplySchema,
		})

		return {
			result: () => {
				const result = capabilityResponse.result()

				return result
			},
		}
	}

	view(
		runtime: Runtime<unknown>,
		input: ViewRequest | ViewRequestJson,
	): { result: () => ViewReply } {
		// Handle input conversion - unwrap if it's a wrapped type, convert from JSON if needed
		let payload: ViewRequest

		if ((input as unknown as { $typeName?: string }).$typeName) {
			// It's the original protobuf type
			payload = input as ViewRequest
		} else {
			// It's regular JSON, convert using fromJson
			payload = fromJson(ViewRequestSchema, input as ViewRequestJson)
		}

		// Include all labels in capability ID for routing when specified
		const capabilityId = `${ClientCapability.CAPABILITY_NAME}:ChainSelector:${this.ChainSelector}@${ClientCapability.CAPABILITY_VERSION}`

		const capabilityResponse = runtime.callCapability<ViewRequest, ViewReply>({
			capabilityId,
			method: 'View',
			payload,
			inputSchema: ViewRequestSchema,
			outputSchema: ViewReplySchema,
		})

		return {
			result: () => {
				const result = capabilityResponse.result()

				return result
			},
		}
	}

	transactionByHash(
		runtime: Runtime<unknown>,
		input: TransactionByHashRequest | TransactionByHashRequestJson,
	): { result: () => TransactionByHashReply } {
		// Handle input conversion - unwrap if it's a wrapped type, convert from JSON if needed
		let payload: TransactionByHashRequest

		if ((input as unknown as { $typeName?: string }).$typeName) {
			// It's the original protobuf type
			payload = input as TransactionByHashRequest
		} else {
			// It's regular JSON, convert using fromJson
			payload = fromJson(TransactionByHashRequestSchema, input as TransactionByHashRequestJson)
		}

		// Include all labels in capability ID for routing when specified
		const capabilityId = `${ClientCapability.CAPABILITY_NAME}:ChainSelector:${this.ChainSelector}@${ClientCapability.CAPABILITY_VERSION}`

		const capabilityResponse = runtime.callCapability<
			TransactionByHashRequest,
			TransactionByHashReply
		>({
			capabilityId,
			method: 'TransactionByHash',
			payload,
			inputSchema: TransactionByHashRequestSchema,
			outputSchema: TransactionByHashReplySchema,
		})

		return {
			result: () => {
				const result = capabilityResponse.result()

				return result
			},
		}
	}

	accountTransactions(
		runtime: Runtime<unknown>,
		input: AccountTransactionsRequest | AccountTransactionsRequestJson,
	): { result: () => AccountTransactionsReply } {
		// Handle input conversion - unwrap if it's a wrapped type, convert from JSON if needed
		let payload: AccountTransactionsRequest

		if ((input as unknown as { $typeName?: string }).$typeName) {
			// It's the original protobuf type
			payload = input as AccountTransactionsRequest
		} else {
			// It's regular JSON, convert using fromJson
			payload = fromJson(AccountTransactionsRequestSchema, input as AccountTransactionsRequestJson)
		}

		// Include all labels in capability ID for routing when specified
		const capabilityId = `${ClientCapability.CAPABILITY_NAME}:ChainSelector:${this.ChainSelector}@${ClientCapability.CAPABILITY_VERSION}`

		const capabilityResponse = runtime.callCapability<
			AccountTransactionsRequest,
			AccountTransactionsReply
		>({
			capabilityId,
			method: 'AccountTransactions',
			payload,
			inputSchema: AccountTransactionsRequestSchema,
			outputSchema: AccountTransactionsReplySchema,
		})

		return {
			result: () => {
				const result = capabilityResponse.result()

				return result
			},
		}
	}

	writeReport(
		runtime: Runtime<unknown>,
		input: WriteCreReportRequest | WriteCreReportRequestJson,
	): { result: () => WriteReportReply } {
		// Handle input conversion - unwrap if it's a wrapped type, convert from JSON if needed
		let payload: WriteReportRequest

		// Check if it's a wrapped type by looking for the $report property
		if ((input as unknown as { $report?: boolean }).$report) {
			// It's a wrapped type, unwrap it
			payload = x_generatedCodeOnly_unwrap_WriteCreReportRequest(input as WriteCreReportRequest)
		} else {
			// It's wrapped JSON, convert using create function
			payload = x_generatedCodeOnly_unwrap_WriteCreReportRequest(
				createWriteCreReportRequest(input as WriteCreReportRequestJson),
			)
		}

		// Include all labels in capability ID for routing when specified
		const capabilityId = `${ClientCapability.CAPABILITY_NAME}:ChainSelector:${this.ChainSelector}@${ClientCapability.CAPABILITY_VERSION}`

		const capabilityResponse = runtime.callCapability<WriteReportRequest, WriteReportReply>({
			capabilityId,
			method: 'WriteReport',
			payload,
			inputSchema: WriteReportRequestSchema,
			outputSchema: WriteReportReplySchema,
		})

		return {
			result: () => {
				const result = capabilityResponse.result()

				return result
			},
		}
	}
}
