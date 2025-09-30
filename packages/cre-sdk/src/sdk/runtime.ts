import type { Message } from '@bufbuild/protobuf'
import type { GenMessage } from '@bufbuild/protobuf/codegenv2'
import type { ReportRequest, ReportRequestJson } from '@cre/generated/sdk/v1alpha/sdk_pb'
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

import type { Report } from '@cre/sdk/report'

export type BaseRuntime<C> = {
	config: C

	// callCapability is meant to be called by generated code only.
	callCapability<I extends Message, O extends Message>(
		params: CallCapabilityParams<I, O>,
	): { result: () => O }

	now(): Date

	log(message: string): void
}

export type Runtime<C> = BaseRuntime<C> &
	SecretsProvider & {
		runInNodeMode<TArgs extends unknown[], TOutput>(
			fn: (nodeRuntime: NodeRuntime<C>, ...args: TArgs) => TOutput,
			consensusAggregation: ConsensusAggregation<TOutput, true>,
			unwrapOptions?: TOutput extends PrimitiveTypes ? never : UnwrapOptions<TOutput>,
		): (...args: TArgs) => { result: () => TOutput }
		report(input: ReportRequest | ReportRequestJson): { result: () => Report }
	}

export type NodeRuntime<C> = BaseRuntime<C> & {
	readonly _isNodeRuntime: true
}
