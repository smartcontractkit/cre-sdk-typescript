import { fromBinary, fromJson, toBinary } from '@bufbuild/protobuf'
import {
	type Inputs,
	type InputsJson,
	InputsSchema,
	type Outputs,
	OutputsSchema,
} from '@cre/generated/capabilities/internal/basicaction/v1/basic_action_pb'
import { type CapabilityResponse, Mode } from '@cre/generated/sdk/v1alpha/sdk_pb'
import { callCapability } from '@cre/sdk/utils/capabilities/call-capability'
import { CapabilityError } from '@cre/sdk/utils/capabilities/capability-error'
import { getTypeUrl } from '@cre/sdk/utils/typeurl'

/**
 * BasicAction Capability
 *
 * Capability ID: basic-test-action@1.0.0
 * Default Mode: Mode.DON
 * Capability Name: basic-test-action
 * Capability Version: 1.0.0
 */
export class BasicActionCapability {
	/** The capability ID for this service */
	static readonly CAPABILITY_ID = 'basic-test-action@1.0.0'

	/** The default execution mode for this capability */
	static readonly DEFAULT_MODE = Mode.DON

	static readonly CAPABILITY_NAME = 'basic-test-action'
	static readonly CAPABILITY_VERSION = '1.0.0'

	constructor(private readonly mode: Mode = BasicActionCapability.DEFAULT_MODE) {}

	performAction(input: Inputs | InputsJson): { result: () => Promise<Outputs> } {
		// biome-ignore lint/suspicious/noExplicitAny: Needed for runtime type checking of protocol buffer messages
		const value = (input as any).$typeName
			? (input as Inputs)
			: fromJson(InputsSchema, input as InputsJson)
		const payload = {
			typeUrl: getTypeUrl(InputsSchema),
			value: toBinary(InputsSchema, value),
		}
		const capabilityId = BasicActionCapability.CAPABILITY_ID

		const capabilityResponse = callCapability({
			capabilityId,
			method: 'PerformAction',
			mode: this.mode,
			payload,
		})

		return {
			result: async () => {
				const { response } = await capabilityResponse.result()

				if (response.case === 'error') {
					throw new CapabilityError(response.value, {
						capabilityId,
						method: 'PerformAction',
						mode: this.mode,
					})
				}

				if (response.case !== 'payload') {
					throw new CapabilityError('No payload in response', {
						capabilityId,
						method: 'PerformAction',
						mode: this.mode,
					})
				}

				return fromBinary(OutputsSchema, response.value.value)
			},
		}
	}
}
