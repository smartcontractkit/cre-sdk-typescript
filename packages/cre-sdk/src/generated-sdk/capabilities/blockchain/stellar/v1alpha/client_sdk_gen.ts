import { create, fromJson } from '@bufbuild/protobuf'
import {
	type GetLatestLedgerRequest,
	type GetLatestLedgerRequestJson,
	GetLatestLedgerRequestSchema,
	type GetLatestLedgerResponse,
	GetLatestLedgerResponseSchema,
	type ReadContractRequest,
	type ReadContractRequestJson,
	ReadContractRequestSchema,
	type ReadContractResponse,
	ReadContractResponseSchema,
	type WriteReportReply,
	WriteReportReplySchema,
	type WriteReportRequest,
	type WriteReportRequestJson,
	WriteReportRequestSchema,
} from '@cre/generated/capabilities/blockchain/stellar/v1alpha/client_pb'
import {
	type CapabilityRestrictionJson,
	type ReportResponse,
	type ReportResponseJson,
	ReportResponseSchema,
} from '@cre/generated/sdk/v1alpha/sdk_pb'
import type { Runtime } from '@cre/sdk'
import { Report } from '@cre/sdk/report'
import { hexToBytes } from '@cre/sdk/utils/hex-utils'
import type { CapabilityInput } from '@cre/sdk/utils/types/no-excess'

export type WriteCreReportRequest = {
	contractId: string
	report?: Report
	$report: true
}

export type WriteCreReportRequestJson = {
	contractId: string
	report?: Report
}

export function x_generatedCodeOnly_wrap_WriteCreReportRequest(
	input: WriteReportRequest,
): WriteCreReportRequest {
	return {
		contractId: input.contractId,
		report: input.report !== undefined ? new Report(input.report) : undefined,
		$report: true,
	}
}

export function createWriteCreReportRequest(
	input: WriteCreReportRequestJson,
): WriteCreReportRequest {
	return {
		contractId: input.contractId,
		report: input.report,
		$report: true,
	}
}

export function x_generatedCodeOnly_unwrap_WriteCreReportRequest(
	input: WriteCreReportRequest,
): WriteReportRequest {
	return create(WriteReportRequestSchema, {
		contractId: input.contractId,
		report: input.report !== undefined ? input.report.x_generatedCodeOnly_unwrap() : undefined,
	})
}

/**
 * Client Capability
 *
 * Capability ID: stellar@1.0.0
 * Capability Name: stellar
 * Capability Version: 1.0.0
 */
export class ClientCapability {
	/** The capability ID for this service */
	static readonly CAPABILITY_ID = 'stellar@1.0.0'

	static readonly CAPABILITY_NAME = 'stellar'
	static readonly CAPABILITY_VERSION = '1.0.0'

	/** Available ChainSelector values */
	static readonly SUPPORTED_CHAIN_SELECTORS = {
		'stellar-mainnet': 17783245649066640917n,
		'stellar-testnet': 4894814558906953166n,
	} as const

	constructor(private readonly ChainSelector: bigint) {}

	getLatestLedger<TInput>(
		runtime: Runtime<unknown>,
		input: CapabilityInput<TInput, GetLatestLedgerRequest, GetLatestLedgerRequestJson>,
	): { result: () => GetLatestLedgerResponse }
	getLatestLedger(
		runtime: Runtime<unknown>,
		input: GetLatestLedgerRequest | GetLatestLedgerRequestJson,
	): { result: () => GetLatestLedgerResponse } {
		// Handle input conversion - unwrap if it's a wrapped type, convert from JSON if needed
		let payload: GetLatestLedgerRequest

		if ((input as unknown as { $typeName?: string }).$typeName) {
			// It's the original protobuf type
			payload = input as GetLatestLedgerRequest
		} else {
			// It's regular JSON, convert using fromJson
			payload = fromJson(GetLatestLedgerRequestSchema, input as GetLatestLedgerRequestJson)
		}

		// Include all labels in capability ID for routing when specified
		const capabilityId = `${ClientCapability.CAPABILITY_NAME}:ChainSelector:${this.ChainSelector}@${ClientCapability.CAPABILITY_VERSION}`

		const capabilityResponse = runtime.callCapability<
			GetLatestLedgerRequest,
			GetLatestLedgerResponse
		>({
			capabilityId,
			method: 'GetLatestLedger',
			payload,
			inputSchema: GetLatestLedgerRequestSchema,
			outputSchema: GetLatestLedgerResponseSchema,
		})

		return {
			result: () => {
				const result = capabilityResponse.result()

				return result
			},
		}
	}

	readContract<TInput>(
		runtime: Runtime<unknown>,
		input: CapabilityInput<TInput, ReadContractRequest, ReadContractRequestJson>,
	): { result: () => ReadContractResponse }
	readContract(
		runtime: Runtime<unknown>,
		input: ReadContractRequest | ReadContractRequestJson,
	): { result: () => ReadContractResponse } {
		// Handle input conversion - unwrap if it's a wrapped type, convert from JSON if needed
		let payload: ReadContractRequest

		if ((input as unknown as { $typeName?: string }).$typeName) {
			// It's the original protobuf type
			payload = input as ReadContractRequest
		} else {
			// It's regular JSON, convert using fromJson
			payload = fromJson(ReadContractRequestSchema, input as ReadContractRequestJson)
		}

		// Include all labels in capability ID for routing when specified
		const capabilityId = `${ClientCapability.CAPABILITY_NAME}:ChainSelector:${this.ChainSelector}@${ClientCapability.CAPABILITY_VERSION}`

		const capabilityResponse = runtime.callCapability<ReadContractRequest, ReadContractResponse>({
			capabilityId,
			method: 'ReadContract',
			payload,
			inputSchema: ReadContractRequestSchema,
			outputSchema: ReadContractResponseSchema,
		})

		return {
			result: () => {
				const result = capabilityResponse.result()

				return result
			},
		}
	}

	writeReport<TInput>(
		runtime: Runtime<unknown>,
		input: CapabilityInput<TInput, WriteCreReportRequest, WriteCreReportRequestJson>,
	): { result: () => WriteReportReply }
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

export class ClientRestrictor {
	constructor(private readonly ChainSelector: bigint) {}

	limitGetLatestLedger(maxCalls: number): CapabilityRestrictionJson {
		// Include all labels in capability ID for routing when specified
		const capabilityId = `${ClientCapability.CAPABILITY_NAME}:ChainSelector:${this.ChainSelector}@${ClientCapability.CAPABILITY_VERSION}`

		return {
			method: {
				id: capabilityId,
				method: 'GetLatestLedger',
				maxCalls,
			},
		}
	}

	limitReadContract(maxCalls: number): CapabilityRestrictionJson {
		// Include all labels in capability ID for routing when specified
		const capabilityId = `${ClientCapability.CAPABILITY_NAME}:ChainSelector:${this.ChainSelector}@${ClientCapability.CAPABILITY_VERSION}`

		return {
			method: {
				id: capabilityId,
				method: 'ReadContract',
				maxCalls,
			},
		}
	}

	limitWriteReport(maxCalls: number): CapabilityRestrictionJson {
		// Include all labels in capability ID for routing when specified
		const capabilityId = `${ClientCapability.CAPABILITY_NAME}:ChainSelector:${this.ChainSelector}@${ClientCapability.CAPABILITY_VERSION}`

		return {
			method: {
				id: capabilityId,
				method: 'WriteReport',
				maxCalls,
			},
		}
	}
}
