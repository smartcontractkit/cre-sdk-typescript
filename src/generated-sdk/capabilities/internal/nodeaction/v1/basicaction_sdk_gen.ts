import { fromBinary, toBinary, fromJson } from '@bufbuild/protobuf'
import { Mode, type CapabilityResponse } from '@cre/generated/sdk/v1alpha/sdk_pb'
import { callCapability } from '@cre/sdk/utils/capabilities/call-capability'
import { CapabilityError } from '@cre/sdk/utils/capabilities/capability-error'
import { getTypeUrl } from '@cre/sdk/utils/typeurl'
import {
	NodeInputsSchema,
	NodeOutputsSchema,
	type NodeInputs,
	type NodeInputsJson,
	type NodeOutputs,
} from '@cre/generated/capabilities/internal/nodeaction/v1/node_action_pb'

/**
 * BasicAction Capability
 *
 * Capability ID: basic-test-node-action@1.0.0
 * Default Mode: Mode.NODE
 * Capability Name: basic-test-node-action
 * Capability Version: 1.0.0
 */
export class BasicActionCapability {
	/** The capability ID for this service */
	static readonly CAPABILITY_ID = 'basic-test-node-action@1.0.0'

	/** The default execution mode for this capability */
	static readonly DEFAULT_MODE = Mode.NODE

	static readonly CAPABILITY_NAME = 'basic-test-node-action'
	static readonly CAPABILITY_VERSION = '1.0.0'

	constructor(private readonly mode: Mode = BasicActionCapability.DEFAULT_MODE) {}

	performAction(input: NodeInputs | NodeInputsJson): { result: () => Promise<NodeOutputs> } {
		// biome-ignore lint/suspicious/noExplicitAny: Needed for runtime type checking of protocol buffer messages
		const value = (input as any).$typeName
			? (input as NodeInputs)
			: fromJson(NodeInputsSchema, input as NodeInputsJson)
		const payload = {
			typeUrl: getTypeUrl(NodeInputsSchema),
			value: toBinary(NodeInputsSchema, value),
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

				return fromBinary(NodeOutputsSchema, response.value.value)
			},
		}
	}
}
