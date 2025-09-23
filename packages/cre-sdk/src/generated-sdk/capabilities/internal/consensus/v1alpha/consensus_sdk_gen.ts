import { fromBinary, fromJson, toBinary } from '@bufbuild/protobuf'
import {
	type CapabilityResponse,
	Mode,
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
import { callCapability } from '@cre/sdk/utils/capabilities/call-capability'
import { CapabilityError } from '@cre/sdk/utils/capabilities/capability-error'
import { getTypeUrl } from '@cre/sdk/utils/typeurl'

/**
 * Consensus Capability
 *
 * Capability ID: consensus@1.0.0-alpha
 * Default Mode: Mode.DON
 * Capability Name: consensus
 * Capability Version: 1.0.0-alpha
 */
export class ConsensusCapability {
	/** The capability ID for this service */
	static readonly CAPABILITY_ID = 'consensus@1.0.0-alpha'

	/** The default execution mode for this capability */
	static readonly DEFAULT_MODE = Mode.DON

	static readonly CAPABILITY_NAME = 'consensus'
	static readonly CAPABILITY_VERSION = '1.0.0-alpha'

	constructor(private readonly mode: Mode = ConsensusCapability.DEFAULT_MODE) {}

	simple(input: SimpleConsensusInputs | SimpleConsensusInputsJson): {
		result: () => Promise<Value>
	} {
		// biome-ignore lint/suspicious/noExplicitAny: Needed for runtime type checking of protocol buffer messages
		const value = (input as any).$typeName
			? (input as SimpleConsensusInputs)
			: fromJson(SimpleConsensusInputsSchema, input as SimpleConsensusInputsJson)
		const payload = {
			typeUrl: getTypeUrl(SimpleConsensusInputsSchema),
			value: toBinary(SimpleConsensusInputsSchema, value),
		}
		const capabilityId = ConsensusCapability.CAPABILITY_ID

		const capabilityResponse = callCapability({
			capabilityId,
			method: 'Simple',
			mode: this.mode,
			payload,
		})

		return {
			result: async () => {
				const { response } = await capabilityResponse.result()

				if (response.case === 'error') {
					throw new CapabilityError(response.value, {
						capabilityId,
						method: 'Simple',
						mode: this.mode,
					})
				}

				if (response.case !== 'payload') {
					throw new CapabilityError('No payload in response', {
						capabilityId,
						method: 'Simple',
						mode: this.mode,
					})
				}

				return fromBinary(ValueSchema, response.value.value)
			},
		}
	}

	report(input: ReportRequest | ReportRequestJson): { result: () => Promise<ReportResponse> } {
		// biome-ignore lint/suspicious/noExplicitAny: Needed for runtime type checking of protocol buffer messages
		const value = (input as any).$typeName
			? (input as ReportRequest)
			: fromJson(ReportRequestSchema, input as ReportRequestJson)
		const payload = {
			typeUrl: getTypeUrl(ReportRequestSchema),
			value: toBinary(ReportRequestSchema, value),
		}
		const capabilityId = ConsensusCapability.CAPABILITY_ID

		const capabilityResponse = callCapability({
			capabilityId,
			method: 'Report',
			mode: this.mode,
			payload,
		})

		return {
			result: async () => {
				const { response } = await capabilityResponse.result()

				if (response.case === 'error') {
					throw new CapabilityError(response.value, {
						capabilityId,
						method: 'Report',
						mode: this.mode,
					})
				}

				if (response.case !== 'payload') {
					throw new CapabilityError('No payload in response', {
						capabilityId,
						method: 'Report',
						mode: this.mode,
					})
				}

				return fromBinary(ReportResponseSchema, response.value.value)
			},
		}
	}
}
