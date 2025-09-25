import { fromJson } from '@bufbuild/protobuf'
import { type Runtime } from '@cre/sdk/runtime/runtime'
import {
	InputsSchema,
	OutputsSchema,
	type Inputs,
	type InputsJson,
	type Outputs,
} from '@cre/generated/capabilities/internal/basicaction/v1/basic_action_pb'

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

	async performAction(runtime: Runtime<any>, input: Inputs | InputsJson): Promise<Outputs> {
		// biome-ignore lint/suspicious/noExplicitAny: Needed for runtime type checking of protocol buffer messages
		const payload = (input as any).$typeName
			? (input as Inputs)
			: fromJson(InputsSchema, input as InputsJson)

		const capabilityId = BasicActionCapability.CAPABILITY_ID

		return runtime.callCapability<Inputs, Outputs>({
			capabilityId,
			method: 'PerformAction',
			payload,
			inputSchema: InputsSchema,
			outputSchema: OutputsSchema,
		})
	}
}
