import { create, fromJson, type MessageInitShape } from '@bufbuild/protobuf'
import {
	type ReportRequest,
	type ReportRequestJson,
	ReportRequestSchema,
	type ReportResponse,
	ReportResponseSchema,
	type SimpleConsensusInputs,
	type SimpleConsensusInputsJson,
	SimpleConsensusInputsSchema,
} from '@cre/generated/sdk/v1alpha/sdk_pb'
import { type Value, ValueSchema } from '@cre/generated/values/v1/values_pb'
import { type Runtime } from '@cre/sdk'
import { Report } from '@cre/sdk/report'
import { hexToBytes } from '@cre/sdk/utils/hex-utils'

/**
 * Consensus Capability
 *
 * Capability ID: consensus@1.0.0-alpha
 * Capability Name: consensus
 * Capability Version: 1.0.0-alpha
 */
export class ConsensusCapability {
	/** The capability ID for this service */
	static readonly CAPABILITY_ID = 'consensus@1.0.0-alpha'

	static readonly CAPABILITY_NAME = 'consensus'
	static readonly CAPABILITY_VERSION = '1.0.0-alpha'

	simple(
		runtime: Runtime<unknown>,
		input: SimpleConsensusInputs | MessageInitShape<typeof SimpleConsensusInputsSchema>,
	): { result: () => Value } {
		// Handle input conversion - unwrap if it's a wrapped type, convert from JSON if needed
		let payload: SimpleConsensusInputs

		if ((input as unknown as { $typeName?: string }).$typeName) {
			// It's the original protobuf type
			payload = input as SimpleConsensusInputs
		} else {
			// It's a plain object initializer, convert using create
			payload = create(
				SimpleConsensusInputsSchema,
				input as MessageInitShape<typeof SimpleConsensusInputsSchema>,
			)
		}

		const capabilityId = ConsensusCapability.CAPABILITY_ID

		const capabilityResponse = runtime.callCapability<SimpleConsensusInputs, Value>({
			capabilityId,
			method: 'Simple',
			payload,
			inputSchema: SimpleConsensusInputsSchema,
			outputSchema: ValueSchema,
		})

		return {
			result: () => {
				const result = capabilityResponse.result()

				return result
			},
		}
	}

	report(
		runtime: Runtime<unknown>,
		input: ReportRequest | MessageInitShape<typeof ReportRequestSchema>,
	): { result: () => Report } {
		// Handle input conversion - unwrap if it's a wrapped type, convert from JSON if needed
		let payload: ReportRequest

		if ((input as unknown as { $typeName?: string }).$typeName) {
			// It's the original protobuf type
			payload = input as ReportRequest
		} else {
			// It's a plain object initializer, convert using create
			payload = create(ReportRequestSchema, input as MessageInitShape<typeof ReportRequestSchema>)
		}

		const capabilityId = ConsensusCapability.CAPABILITY_ID

		const capabilityResponse = runtime.callCapability<ReportRequest, ReportResponse>({
			capabilityId,
			method: 'Report',
			payload,
			inputSchema: ReportRequestSchema,
			outputSchema: ReportResponseSchema,
		})

		return {
			result: () => {
				const result = capabilityResponse.result()

				return new Report(result)
			},
		}
	}
}
