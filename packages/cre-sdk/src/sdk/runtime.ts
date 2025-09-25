import type { Message } from '@bufbuild/protobuf'
import type { GenMessage } from '@bufbuild/protobuf/codegenv2'
import type { ConsensusAggregation, PrimitiveTypes, UnwrapOptions } from '@cre/sdk/utils'
import type { SecretsProvider } from '.'

export type CallCapabilityParams<I extends Message, O extends Message> = {
	capabilityId: string
	method: string
	payload: I
	inputSchema: GenMessage<I>
	outputSchema: GenMessage<O>
}

export type BaseRuntime<C> = {
	config: C

	// callCapability is meant to be called by generated code only.
	callCapability<I extends Message, O extends Message>(
		params: CallCapabilityParams<I, O>,
	): { result: () => Promise<O> }

	now(): Date
}

export type Runtime<C> = BaseRuntime<C> &
	SecretsProvider & {
		runInNodeMode<TArgs extends any[], TOutput>(
			fn: (nodeRuntime: NodeRuntime<C>, ...args: TArgs) => Promise<TOutput> | TOutput,
			consensusAggregation: ConsensusAggregation<TOutput, true>,
			unwrapOptions?: TOutput extends PrimitiveTypes ? never : UnwrapOptions<TOutput>,
		): (...args: TArgs) => Promise<TOutput>
	}

export type NodeRuntime<C> = BaseRuntime<C> & {
	readonly _isNodeRuntime: true
}
