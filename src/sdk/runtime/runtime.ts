import type { Message } from "@bufbuild/protobuf"
import type { GenMessage } from "@bufbuild/protobuf/codegenv2";
import type { ConsensusDescriptor } from '@cre/generated/sdk/v1alpha/sdk_pb';
import type { SecretRequest, Secret } from '@cre/generated/sdk/v1alpha/sdk_pb'


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
		params: CallCapabilityParams<I, O>
	): Promise<O>
}

// TODO helpers for consensus aggregation
export type ConsensusAggregation<T> = {
	descriptor: ConsensusDescriptor
	default?: T
}

export type Runtime<C> = BaseRuntime<C> & {
	runInNodeMode<O>(callback: (nodeRuntime: NodeRuntime<C>) => O, ca: ConsensusAggregation<O>): Promise<O>
	getSecret(request: SecretRequest): Promise<Secret>
}

export type NodeRuntime<C> = BaseRuntime<C> & {
 readonly _isNodeRuntime: true;
}


