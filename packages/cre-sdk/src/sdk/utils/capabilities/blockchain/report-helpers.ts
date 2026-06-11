import type { ReportRequestJson } from '@cre/generated/sdk/v1alpha/sdk_pb'

/**
 * Report-encoder settings for a chain family (everything in a `ReportRequest`
 * except the payload itself). See `EVM_DEFAULT_REPORT_ENCODER` and
 * `SOLANA_DEFAULT_REPORT_ENCODER` for the per-chain defaults.
 */
export type ReportEncoder = Omit<ReportRequestJson, 'encodedPayload'>

/**
 * Chain-agnostic core for building a `ReportRequest` from raw payload bytes.
 *
 * Per-chain wrappers (`prepareReportRequest` for EVM hex payloads,
 * `prepareSolanaReportRequest` for Solana Borsh payloads) delegate here so
 * there is a single payload-assembly path.
 *
 * @param payload - The raw payload bytes to be signed.
 * @param reportEncoder - The report encoder settings to use.
 * @returns The prepared report request.
 */
export const prepareReportRequestFromBytes = (
	payload: Uint8Array,
	reportEncoder: ReportEncoder,
): ReportRequestJson => ({
	encodedPayload: Buffer.from(payload).toString('base64'),
	...reportEncoder,
})
