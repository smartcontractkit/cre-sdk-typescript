import { create, fromJson } from '@bufbuild/protobuf'
import { type Any, AnySchema, anyPack } from '@bufbuild/protobuf/wkt'
import {
	type AccountMeta,
	type AccountMetaJson,
	AccountMetaSchema,
	type ComputeConfig,
	type ComputeConfigJson,
	ComputeConfigSchema,
	type FilterLogTriggerRequest,
	type FilterLogTriggerRequestJson,
	FilterLogTriggerRequestSchema,
	type GetAccountInfoWithOptsReply,
	GetAccountInfoWithOptsReplySchema,
	type GetAccountInfoWithOptsRequest,
	type GetAccountInfoWithOptsRequestJson,
	GetAccountInfoWithOptsRequestSchema,
	type GetBalanceReply,
	GetBalanceReplySchema,
	type GetBalanceRequest,
	type GetBalanceRequestJson,
	GetBalanceRequestSchema,
	type GetBlockReply,
	GetBlockReplySchema,
	type GetBlockRequest,
	type GetBlockRequestJson,
	GetBlockRequestSchema,
	type GetFeeForMessageReply,
	GetFeeForMessageReplySchema,
	type GetFeeForMessageRequest,
	type GetFeeForMessageRequestJson,
	GetFeeForMessageRequestSchema,
	type GetMultipleAccountsWithOptsReply,
	GetMultipleAccountsWithOptsReplySchema,
	type GetMultipleAccountsWithOptsRequest,
	type GetMultipleAccountsWithOptsRequestJson,
	GetMultipleAccountsWithOptsRequestSchema,
	type GetSignatureStatusesReply,
	GetSignatureStatusesReplySchema,
	type GetSignatureStatusesRequest,
	type GetSignatureStatusesRequestJson,
	GetSignatureStatusesRequestSchema,
	type GetSlotHeightReply,
	GetSlotHeightReplySchema,
	type GetSlotHeightRequest,
	type GetSlotHeightRequestJson,
	GetSlotHeightRequestSchema,
	type GetTransactionReply,
	GetTransactionReplySchema,
	type GetTransactionRequest,
	type GetTransactionRequestJson,
	GetTransactionRequestSchema,
	type Log,
	LogSchema,
	type WriteReportReply,
	WriteReportReplySchema,
	type WriteReportRequest,
	type WriteReportRequestJson,
	WriteReportRequestSchema,
} from '@cre/generated/capabilities/blockchain/solana/v1alpha/client_pb'
import {
	type ReportResponse,
	type ReportResponseJson,
	ReportResponseSchema,
} from '@cre/generated/sdk/v1alpha/sdk_pb'
import type { Runtime } from '@cre/sdk'
import { Report } from '@cre/sdk/report'
import { hexToBytes } from '@cre/sdk/utils/hex-utils'
import type { Trigger } from '@cre/sdk/utils/triggers/trigger-interface'

export type WriteCreReportRequest = {
	remainingAccounts: AccountMeta[]
	receiver: Uint8Array
	computeConfig?: ComputeConfig
	report?: Report
	$report: true
}

export type WriteCreReportRequestJson = {
	remainingAccounts: AccountMetaJson[]
	receiver: string
	computeConfig?: ComputeConfigJson
	report?: Report
}

export function x_generatedCodeOnly_wrap_WriteCreReportRequest(
	input: WriteReportRequest,
): WriteCreReportRequest {
	return {
		remainingAccounts: input.remainingAccounts,
		receiver: input.receiver,
		computeConfig: input.computeConfig,
		report: input.report !== undefined ? new Report(input.report) : undefined,
		$report: true,
	}
}

export function createWriteCreReportRequest(
	input: WriteCreReportRequestJson,
): WriteCreReportRequest {
	return {
		remainingAccounts: (input.remainingAccounts ?? []).map((v) => fromJson(AccountMetaSchema, v)),
		receiver: hexToBytes(input.receiver),
		computeConfig:
			input.computeConfig !== undefined
				? fromJson(ComputeConfigSchema, input.computeConfig)
				: undefined,
		report: input.report,
		$report: true,
	}
}

export function x_generatedCodeOnly_unwrap_WriteCreReportRequest(
	input: WriteCreReportRequest,
): WriteReportRequest {
	return create(WriteReportRequestSchema, {
		remainingAccounts: input.remainingAccounts,
		receiver: input.receiver,
		computeConfig: input.computeConfig,
		report: input.report !== undefined ? input.report.x_generatedCodeOnly_unwrap() : undefined,
	})
}

/**
 * Client Capability
 *
 * Capability ID: solana@1.0.0
 * Capability Name: solana
 * Capability Version: 1.0.0
 */
export class ClientCapability {
	/** The capability ID for this service */
	static readonly CAPABILITY_ID = 'solana@1.0.0'

	static readonly CAPABILITY_NAME = 'solana'
	static readonly CAPABILITY_VERSION = '1.0.0'

	/** Available ChainSelector values */
	static readonly SUPPORTED_CHAIN_SELECTORS = {
		'solana-devnet': 16423721717087811551n,
		'solana-mainnet': 124615329519749607n,
		'solana-testnet': 6302590918974934319n,
	} as const

	constructor(private readonly ChainSelector: bigint) {}

	getAccountInfoWithOpts(
		runtime: Runtime<unknown>,
		input: GetAccountInfoWithOptsRequest | GetAccountInfoWithOptsRequestJson,
	): { result: () => GetAccountInfoWithOptsReply } {
		// Handle input conversion - unwrap if it's a wrapped type, convert from JSON if needed
		let payload: GetAccountInfoWithOptsRequest

		if ((input as unknown as { $typeName?: string }).$typeName) {
			// It's the original protobuf type
			payload = input as GetAccountInfoWithOptsRequest
		} else {
			// It's regular JSON, convert using fromJson
			payload = fromJson(
				GetAccountInfoWithOptsRequestSchema,
				input as GetAccountInfoWithOptsRequestJson,
			)
		}

		// Include all labels in capability ID for routing when specified
		const capabilityId = `${ClientCapability.CAPABILITY_NAME}:ChainSelector:${this.ChainSelector}@${ClientCapability.CAPABILITY_VERSION}`

		const capabilityResponse = runtime.callCapability<
			GetAccountInfoWithOptsRequest,
			GetAccountInfoWithOptsReply
		>({
			capabilityId,
			method: 'GetAccountInfoWithOpts',
			payload,
			inputSchema: GetAccountInfoWithOptsRequestSchema,
			outputSchema: GetAccountInfoWithOptsReplySchema,
		})

		return {
			result: () => {
				const result = capabilityResponse.result()

				return result
			},
		}
	}

	getBalance(
		runtime: Runtime<unknown>,
		input: GetBalanceRequest | GetBalanceRequestJson,
	): { result: () => GetBalanceReply } {
		// Handle input conversion - unwrap if it's a wrapped type, convert from JSON if needed
		let payload: GetBalanceRequest

		if ((input as unknown as { $typeName?: string }).$typeName) {
			// It's the original protobuf type
			payload = input as GetBalanceRequest
		} else {
			// It's regular JSON, convert using fromJson
			payload = fromJson(GetBalanceRequestSchema, input as GetBalanceRequestJson)
		}

		// Include all labels in capability ID for routing when specified
		const capabilityId = `${ClientCapability.CAPABILITY_NAME}:ChainSelector:${this.ChainSelector}@${ClientCapability.CAPABILITY_VERSION}`

		const capabilityResponse = runtime.callCapability<GetBalanceRequest, GetBalanceReply>({
			capabilityId,
			method: 'GetBalance',
			payload,
			inputSchema: GetBalanceRequestSchema,
			outputSchema: GetBalanceReplySchema,
		})

		return {
			result: () => {
				const result = capabilityResponse.result()

				return result
			},
		}
	}

	getBlock(
		runtime: Runtime<unknown>,
		input: GetBlockRequest | GetBlockRequestJson,
	): { result: () => GetBlockReply } {
		// Handle input conversion - unwrap if it's a wrapped type, convert from JSON if needed
		let payload: GetBlockRequest

		if ((input as unknown as { $typeName?: string }).$typeName) {
			// It's the original protobuf type
			payload = input as GetBlockRequest
		} else {
			// It's regular JSON, convert using fromJson
			payload = fromJson(GetBlockRequestSchema, input as GetBlockRequestJson)
		}

		// Include all labels in capability ID for routing when specified
		const capabilityId = `${ClientCapability.CAPABILITY_NAME}:ChainSelector:${this.ChainSelector}@${ClientCapability.CAPABILITY_VERSION}`

		const capabilityResponse = runtime.callCapability<GetBlockRequest, GetBlockReply>({
			capabilityId,
			method: 'GetBlock',
			payload,
			inputSchema: GetBlockRequestSchema,
			outputSchema: GetBlockReplySchema,
		})

		return {
			result: () => {
				const result = capabilityResponse.result()

				return result
			},
		}
	}

	getFeeForMessage(
		runtime: Runtime<unknown>,
		input: GetFeeForMessageRequest | GetFeeForMessageRequestJson,
	): { result: () => GetFeeForMessageReply } {
		// Handle input conversion - unwrap if it's a wrapped type, convert from JSON if needed
		let payload: GetFeeForMessageRequest

		if ((input as unknown as { $typeName?: string }).$typeName) {
			// It's the original protobuf type
			payload = input as GetFeeForMessageRequest
		} else {
			// It's regular JSON, convert using fromJson
			payload = fromJson(GetFeeForMessageRequestSchema, input as GetFeeForMessageRequestJson)
		}

		// Include all labels in capability ID for routing when specified
		const capabilityId = `${ClientCapability.CAPABILITY_NAME}:ChainSelector:${this.ChainSelector}@${ClientCapability.CAPABILITY_VERSION}`

		const capabilityResponse = runtime.callCapability<
			GetFeeForMessageRequest,
			GetFeeForMessageReply
		>({
			capabilityId,
			method: 'GetFeeForMessage',
			payload,
			inputSchema: GetFeeForMessageRequestSchema,
			outputSchema: GetFeeForMessageReplySchema,
		})

		return {
			result: () => {
				const result = capabilityResponse.result()

				return result
			},
		}
	}

	getMultipleAccountsWithOpts(
		runtime: Runtime<unknown>,
		input: GetMultipleAccountsWithOptsRequest | GetMultipleAccountsWithOptsRequestJson,
	): { result: () => GetMultipleAccountsWithOptsReply } {
		// Handle input conversion - unwrap if it's a wrapped type, convert from JSON if needed
		let payload: GetMultipleAccountsWithOptsRequest

		if ((input as unknown as { $typeName?: string }).$typeName) {
			// It's the original protobuf type
			payload = input as GetMultipleAccountsWithOptsRequest
		} else {
			// It's regular JSON, convert using fromJson
			payload = fromJson(
				GetMultipleAccountsWithOptsRequestSchema,
				input as GetMultipleAccountsWithOptsRequestJson,
			)
		}

		// Include all labels in capability ID for routing when specified
		const capabilityId = `${ClientCapability.CAPABILITY_NAME}:ChainSelector:${this.ChainSelector}@${ClientCapability.CAPABILITY_VERSION}`

		const capabilityResponse = runtime.callCapability<
			GetMultipleAccountsWithOptsRequest,
			GetMultipleAccountsWithOptsReply
		>({
			capabilityId,
			method: 'GetMultipleAccountsWithOpts',
			payload,
			inputSchema: GetMultipleAccountsWithOptsRequestSchema,
			outputSchema: GetMultipleAccountsWithOptsReplySchema,
		})

		return {
			result: () => {
				const result = capabilityResponse.result()

				return result
			},
		}
	}

	getSignatureStatuses(
		runtime: Runtime<unknown>,
		input: GetSignatureStatusesRequest | GetSignatureStatusesRequestJson,
	): { result: () => GetSignatureStatusesReply } {
		// Handle input conversion - unwrap if it's a wrapped type, convert from JSON if needed
		let payload: GetSignatureStatusesRequest

		if ((input as unknown as { $typeName?: string }).$typeName) {
			// It's the original protobuf type
			payload = input as GetSignatureStatusesRequest
		} else {
			// It's regular JSON, convert using fromJson
			payload = fromJson(
				GetSignatureStatusesRequestSchema,
				input as GetSignatureStatusesRequestJson,
			)
		}

		// Include all labels in capability ID for routing when specified
		const capabilityId = `${ClientCapability.CAPABILITY_NAME}:ChainSelector:${this.ChainSelector}@${ClientCapability.CAPABILITY_VERSION}`

		const capabilityResponse = runtime.callCapability<
			GetSignatureStatusesRequest,
			GetSignatureStatusesReply
		>({
			capabilityId,
			method: 'GetSignatureStatuses',
			payload,
			inputSchema: GetSignatureStatusesRequestSchema,
			outputSchema: GetSignatureStatusesReplySchema,
		})

		return {
			result: () => {
				const result = capabilityResponse.result()

				return result
			},
		}
	}

	getSlotHeight(
		runtime: Runtime<unknown>,
		input: GetSlotHeightRequest | GetSlotHeightRequestJson,
	): { result: () => GetSlotHeightReply } {
		// Handle input conversion - unwrap if it's a wrapped type, convert from JSON if needed
		let payload: GetSlotHeightRequest

		if ((input as unknown as { $typeName?: string }).$typeName) {
			// It's the original protobuf type
			payload = input as GetSlotHeightRequest
		} else {
			// It's regular JSON, convert using fromJson
			payload = fromJson(GetSlotHeightRequestSchema, input as GetSlotHeightRequestJson)
		}

		// Include all labels in capability ID for routing when specified
		const capabilityId = `${ClientCapability.CAPABILITY_NAME}:ChainSelector:${this.ChainSelector}@${ClientCapability.CAPABILITY_VERSION}`

		const capabilityResponse = runtime.callCapability<GetSlotHeightRequest, GetSlotHeightReply>({
			capabilityId,
			method: 'GetSlotHeight',
			payload,
			inputSchema: GetSlotHeightRequestSchema,
			outputSchema: GetSlotHeightReplySchema,
		})

		return {
			result: () => {
				const result = capabilityResponse.result()

				return result
			},
		}
	}

	getTransaction(
		runtime: Runtime<unknown>,
		input: GetTransactionRequest | GetTransactionRequestJson,
	): { result: () => GetTransactionReply } {
		// Handle input conversion - unwrap if it's a wrapped type, convert from JSON if needed
		let payload: GetTransactionRequest

		if ((input as unknown as { $typeName?: string }).$typeName) {
			// It's the original protobuf type
			payload = input as GetTransactionRequest
		} else {
			// It's regular JSON, convert using fromJson
			payload = fromJson(GetTransactionRequestSchema, input as GetTransactionRequestJson)
		}

		// Include all labels in capability ID for routing when specified
		const capabilityId = `${ClientCapability.CAPABILITY_NAME}:ChainSelector:${this.ChainSelector}@${ClientCapability.CAPABILITY_VERSION}`

		const capabilityResponse = runtime.callCapability<GetTransactionRequest, GetTransactionReply>({
			capabilityId,
			method: 'GetTransaction',
			payload,
			inputSchema: GetTransactionRequestSchema,
			outputSchema: GetTransactionReplySchema,
		})

		return {
			result: () => {
				const result = capabilityResponse.result()

				return result
			},
		}
	}

	logTrigger(config: FilterLogTriggerRequestJson): ClientLogTrigger {
		// Include all labels in capability ID for routing when specified
		const capabilityId = `${ClientCapability.CAPABILITY_NAME}:ChainSelector:${this.ChainSelector}@${ClientCapability.CAPABILITY_VERSION}`
		return new ClientLogTrigger(config, capabilityId, 'LogTrigger', this.ChainSelector)
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

/**
 * Trigger implementation for LogTrigger
 */
class ClientLogTrigger implements Trigger<Log, Log> {
	public readonly config: FilterLogTriggerRequest
	constructor(
		config: FilterLogTriggerRequest | FilterLogTriggerRequestJson,
		private readonly _capabilityId: string,
		private readonly _method: string,
		private readonly ChainSelector: bigint,
	) {
		// biome-ignore lint/suspicious/noExplicitAny: Needed for runtime type checking of protocol buffer messages
		this.config = (config as any).$typeName
			? (config as FilterLogTriggerRequest)
			: fromJson(FilterLogTriggerRequestSchema, config as FilterLogTriggerRequestJson)
	}

	capabilityId(): string {
		return this._capabilityId
	}

	method(): string {
		return this._method
	}

	outputSchema() {
		return LogSchema
	}

	configAsAny(): Any {
		return anyPack(FilterLogTriggerRequestSchema, this.config)
	}

	/**
	 * Transform the raw trigger output - override this method if needed
	 * Default implementation returns the raw output unchanged
	 */
	adapt(rawOutput: Log): Log {
		return rawOutput
	}
}
