import { fromJson } from '@bufbuild/protobuf'
import {
	type NodeInputs,
	type NodeInputsJson,
	NodeInputsSchema,
	type NodeOutputs,
	NodeOutputsSchema,
} from '@cre/generated/capabilities/internal/nodeaction/v1/node_action_pb'
import type { NodeRuntime, Runtime } from '@cre/sdk/runtime'
import type { ConsensusAggregation, PrimitiveTypes, UnwrapOptions } from '@cre/sdk/utils'

export class PerformActioner {
	constructor(
		private readonly runtime: NodeRuntime<any>,
		private readonly client: BasicActionCapability,
	) {}
	performAction(input: NodeInputs | NodeInputsJson): { result: () => Promise<NodeOutputs> } {
		return this.client.performAction(this.runtime, input)
	}
}

/**
 * BasicAction Capability
 *
 * Capability ID: basic-test-node-action@1.0.0
 * Capability Name: basic-test-node-action
 * Capability Version: 1.0.0
 */
export class BasicActionCapability {
	/** The capability ID for this service */
	static readonly CAPABILITY_ID = 'basic-test-node-action@1.0.0'

	static readonly CAPABILITY_NAME = 'basic-test-node-action'
	static readonly CAPABILITY_VERSION = '1.0.0'

	constructor() {}

	performAction(
		runtime: NodeRuntime<any>,
		input: NodeInputs | NodeInputsJson,
	): { result: () => NodeOutputs } {
		// biome-ignore lint/suspicious/noExplicitAny: Needed for runtime type checking of protocol buffer messages
		const payload = (input as any).$typeName
			? (input as NodeInputs)
			: fromJson(NodeInputsSchema, input as NodeInputsJson)

		const capabilityId = BasicActionCapability.CAPABILITY_ID

		const capabilityResponse = runtime.callCapability<NodeInputs, NodeOutputs>({
			capabilityId,
			method: 'PerformAction',
			payload,
			inputSchema: NodeInputsSchema,
			outputSchema: NodeOutputsSchema,
		})

		return {
			result: () => {
				return capabilityResponse.result()
			},
		}
	}
}
