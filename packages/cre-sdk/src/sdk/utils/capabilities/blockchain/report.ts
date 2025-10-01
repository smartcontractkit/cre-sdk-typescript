import { create } from '@bufbuild/protobuf'
import {
	type ReportRequest,
	ReportRequestSchema,
	type ReportResponse,
} from '@cre/generated/sdk/v1alpha/sdk_pb'

/**
 * Report contains a signed report from the CRE workflow DON.
 * Reports contain metadata including workflow ID, workflow owner, and execution ID,
 * alongside the encoded payload and signatures from F+1 nodes in the workflow DON.
 *
 * Reports prove that data came from a specific workflow or author.
 * Blockchains integrated with CRE have forwarder contracts that verify report integrity.
 */
export class Report {
	constructor(private readonly _response: ReportResponse) {}

	/**
	 * Get the underlying ReportResponse protobuf message
	 * @internal - Used by generated code and internal utilities
	 */
	get response(): ReportResponse {
		return this._response
	}

	/** Configuration digest identifying the DON configuration */
	get configDigest(): Uint8Array {
		return this._response.configDigest
	}

	/** Sequence number for this report */
	get seqNr(): bigint {
		return this._response.seqNr
	}

	/** Report context (combination of seq_nr and config_digest) */
	get reportContext(): Uint8Array {
		return this._response.reportContext
	}

	/** Raw report bytes containing metadata + encoded payload */
	get rawReport(): Uint8Array {
		return this._response.rawReport
	}

	/** Attributed signatures from DON nodes */
	get sigs(): ReadonlyArray<{ signature: Uint8Array; signerId: number }> {
		return this._response.sigs
	}
}

/**
 * Parameters for creating a report request
 */
export type ReportRequestParams = {
	/** Encoded payload to be signed. Can be base64 string or Uint8Array */
	encodedPayload: string | Uint8Array
	/** Encoder name - defaults to 'evm' for Ethereum Virtual Machine */
	encoderName?: 'evm' | string
	/** Signing algorithm - defaults to 'ecdsa' */
	signingAlgo?: 'ecdsa' | string
	/** Hashing algorithm - defaults to 'keccak256' */
	hashingAlgo?: 'keccak256' | string
}

/**
 * Helper to create a ReportRequest with type-safe parameters and sensible defaults.
 *
 * Defaults:
 * - encoderName: 'evm'
 * - signingAlgo: 'ecdsa'
 * - hashingAlgo: 'keccak256'
 *
 * @example
 * ```typescript
 * // Minimal usage with defaults
 * const request = createReportRequest({ encodedPayload: callData })
 *
 * // Custom configuration
 * const request = createReportRequest({
 *   encodedPayload: callData,
 *   encoderName: 'custom',
 *   signingAlgo: 'ed25519',
 *   hashingAlgo: 'sha256'
 * })
 * ```
 */
export const createReportRequest = (params: ReportRequestParams): ReportRequest => {
	const {
		encodedPayload,
		encoderName = 'evm',
		signingAlgo = 'ecdsa',
		hashingAlgo = 'keccak256',
	} = params

	return create(ReportRequestSchema, {
		encodedPayload:
			typeof encodedPayload === 'string' ? Buffer.from(encodedPayload, 'base64') : encodedPayload,
		encoderName,
		signingAlgo,
		hashingAlgo,
	})
}

/**
 * Helper to convert a Report to a JSON-serializable format
 */
export const reportToJson = (report: Report) => ({
	configDigest: Buffer.from(report.configDigest).toString('base64'),
	seqNr: report.seqNr.toString(),
	reportContext: Buffer.from(report.reportContext).toString('base64'),
	rawReport: Buffer.from(report.rawReport).toString('base64'),
	sigs: report.sigs.map((sig) => ({
		signature: Buffer.from(sig.signature).toString('base64'),
		signerId: sig.signerId,
	})),
})

// Re-export for convenience
export type { ReportRequest }
