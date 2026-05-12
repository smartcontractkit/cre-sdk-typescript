import { fromJson } from '@bufbuild/protobuf'
import {
	type Inputs,
	type InputsJson,
	InputsSchema,
	type Outputs,
	OutputsSchema,
} from '@cre/generated/capabilities/internal/basicaction/v1/basic_action_pb'
import type { Runtime } from '@cre/sdk'
import { Report } from '@cre/sdk/report'
import { hexToBytes } from '@cre/sdk/utils/hex-utils'

/**
 * BasicAction Capability
 *
 * Capability ID: basic-test-action@1.0.0
 * Capability Name: basic-test-action
 * Capability Version: 1.0.0
 */
export class BasicActionCapability {
	/** The capability ID for this service */
	static readonly CAPABILITY_ID = 'basic-test-action@1.0.0'

	static readonly CAPABILITY_NAME = 'basic-test-action'
	static readonly CAPABILITY_VERSION = '1.0.0'

	performAction(runtime: Runtime<unknown>, input: Inputs | InputsJson): { result: () => Outputs } {
		// Handle input conversion - unwrap if it's a wrapped type, convert from JSON if needed
		let payload: Inputs

		if ((input as unknown as { $typeName?: string }).$typeName) {
			// It's the original protobuf type
			payload = input as Inputs
		} else {
			// It's regular JSON, convert using fromJson
			payload = fromJson(InputsSchema, input as InputsJson)
		}

		const capabilityId = BasicActionCapability.CAPABILITY_ID

		const capabilityResponse = runtime.callCapability<Inputs, Outputs>({
			capabilityId,
			method: 'PerformAction',
			payload,
			inputSchema: InputsSchema,
			outputSchema: OutputsSchema,
		})

		return {
			result: () => {
				const result = capabilityResponse.result()

				return result
			},
		}
	}
}
