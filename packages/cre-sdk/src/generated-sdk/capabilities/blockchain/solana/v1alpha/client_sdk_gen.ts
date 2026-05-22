import { create, fromJson } from '@bufbuild/protobuf'
import {
	type AccountMeta,
	type AccountMetaJson,
	AccountMetaSchema,
	type ComputeConfig,
	type ComputeConfigJson,
	ComputeConfigSchema,
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
	} as const

	constructor(private readonly ChainSelector: bigint) {}

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
