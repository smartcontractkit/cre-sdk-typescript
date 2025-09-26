import { fromJson } from '@bufbuild/protobuf'
import {
	type Inputs,
	type InputsJson,
	InputsSchema,
	type Outputs,
	OutputsSchema,
} from '@cre/generated/capabilities/internal/basicaction/v1/basic_action_pb'
import { type Runtime } from '@cre/sdk/runtime'

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

	constructor() {}

	performAction(runtime: Runtime<any>, input: Inputs | InputsJson): { result: () => Outputs } {
		// biome-ignore lint/suspicious/noExplicitAny: Needed for runtime type checking of protocol buffer messages
		const payload = (input as any).$typeName
			? (input as Inputs)
			: fromJson(InputsSchema, input as InputsJson)

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
				return capabilityResponse.result()
			},
		}
	}
}
