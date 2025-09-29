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
		private readonly runtime: NodeRuntime<unknown>,
		private readonly client: BasicActionCapability,
	) {}
	performAction(input: NodeInputs | NodeInputsJson): { result: () => NodeOutputs } {
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

	performAction(
		runtime: NodeRuntime<unknown>,
		input: NodeInputs | NodeInputsJson,
	): { result: () => NodeOutputs }
	performAction<TArgs extends unknown[], TOutput>(
		runtime: Runtime<unknown>,
		fn: (performActioner: PerformActioner, ...args: TArgs) => TOutput,
		consensusAggregation: ConsensusAggregation<TOutput, true>,
		unwrapOptions?: TOutput extends PrimitiveTypes ? never : UnwrapOptions<TOutput>,
	): (...args: TArgs) => { result: () => TOutput }
	performAction(...args: unknown[]): unknown {
		// Check if this is the sugar syntax overload (has function parameter)
		if (typeof args[1] === 'function') {
			const [runtime, fn, consensusAggregation, unwrapOptions] = args as [
				Runtime<unknown>,
				(performActioner: PerformActioner, ...args: unknown[]) => unknown,
				ConsensusAggregation<unknown, true>,
				UnwrapOptions<unknown> | undefined,
			]
			return this.performActionSugarHelper(runtime, fn, consensusAggregation, unwrapOptions)
		}
		// Otherwise, this is the basic call overload
		const [runtime, input] = args as [NodeRuntime<unknown>, NodeInputs | NodeInputsJson]
		return this.performActionCallHelper(runtime, input)
	}
	private performActionCallHelper(
		runtime: NodeRuntime<unknown>,
		input: NodeInputs | NodeInputsJson,
	): { result: () => NodeOutputs } {
		const payload = (input as unknown as { $typeName?: string }).$typeName
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
	private performActionSugarHelper<TArgs extends unknown[], TOutput>(
		runtime: Runtime<unknown>,
		fn: (performActioner: PerformActioner, ...args: TArgs) => TOutput,
		consensusAggregation: ConsensusAggregation<TOutput, true>,
		unwrapOptions?: TOutput extends PrimitiveTypes ? never : UnwrapOptions<TOutput>,
	): (...args: TArgs) => { result: () => TOutput } {
		const wrappedFn = (runtime: NodeRuntime<unknown>, ...args: TArgs) => {
			const performActioner = new PerformActioner(runtime, this)
			return fn(performActioner, ...args)
		}
		return runtime.runInNodeMode(wrappedFn, consensusAggregation, unwrapOptions)
	}
}
