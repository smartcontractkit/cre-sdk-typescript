import type { Message } from '@bufbuild/protobuf'
import type { GenMessage } from '@bufbuild/protobuf/codegenv2'
import type { ReportRequest, ReportRequestJson } from '@cre/generated/sdk/v1alpha/sdk_pb'
import type { Report } from '@cre/sdk/report'
import type { ConsensusAggregation, PrimitiveTypes, UnwrapOptions } from '@cre/sdk/utils'
import type { SecretsProvider } from '.'

export type { ReportRequest, ReportRequestJson }

export type CallCapabilityParams<I extends Message, O extends Message> = {
	capabilityId: string
	method: string
	payload: I
	inputSchema: GenMessage<I>
	outputSchema: GenMessage<O>
}

/**
 * Base runtime available in both DON and Node execution modes.
 * Provides core functionality for calling capabilities and logging.
 */
export interface BaseRuntime<C> {
	config: C

	// callCapability is meant to be called by generated code only.
	callCapability<I extends Message, O extends Message>(
		params: CallCapabilityParams<I, O>,
	): { result: () => O }

	now(): Date

	log(message: string): void
}

/**
 * Runtime for Node mode execution.
 */
export interface NodeRuntime<C> extends BaseRuntime<C> {
	readonly _isNodeRuntime: true
}

/**
 * Runtime for DON mode execution.
 */
export interface Runtime<C> extends BaseRuntime<C>, SecretsProvider {
	/**
	 * Executes a function in Node mode and aggregates results via consensus.
	 *
	 * @param fn - Function to execute in each node (receives NodeRuntime)
	 * @param consensusAggregation - How to aggregate results across nodes
	 * @param unwrapOptions - Optional unwrapping config for complex return types
	 * @returns Wrapped function that returns aggregated result
	 */
	runInNodeMode<TArgs extends unknown[], TOutput>(
		fn: (nodeRuntime: NodeRuntime<C>, ...args: TArgs) => TOutput,
		consensusAggregation: ConsensusAggregation<TOutput, true>,
		unwrapOptions?: TOutput extends PrimitiveTypes ? never : UnwrapOptions<TOutput>,
	): (...args: TArgs) => { result: () => TOutput }

	report(input: ReportRequest | ReportRequestJson): { result: () => Report }
}
