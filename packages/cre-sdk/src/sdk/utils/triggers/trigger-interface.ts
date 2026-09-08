import type { Message } from '@bufbuild/protobuf'
import type { GenMessage } from '@bufbuild/protobuf/codegenv2'
import type { Any } from '@bufbuild/protobuf/wkt'

/**
 * Full trigger interface with adapt method
 *
 * The adapt method allows transformation of the raw protobuf output
 * to a more convenient type for the workflow.
 */
export interface Trigger<
	TRawTriggerOutput extends Message<string>,
	TTriggerOutput = TRawTriggerOutput,
> {
	/** The capability ID for this trigger */
	capabilityId(): string

	/** The method name for this trigger */
	method(): string

	/** Access the raw output schema for decoding */
	outputSchema(): GenMessage<TRawTriggerOutput>

	/** Get the configuration as an Any type for protobuf serialization */
	configAsAny(): Any

	/** Transform the raw trigger output to the adapted type */
	adapt(rawOutput: TRawTriggerOutput): TTriggerOutput
}

/**
 * Wraps a trigger with an extra output transformation, delegating everything
 * else to the wrapped trigger. The TypeScript analog of Go bindings embedding
 * `cre.Trigger` and overriding only `Adapt` — generated bindings use this to
 * decode raw trigger outputs into typed data.
 */
export const adaptTrigger = <TRaw extends Message<string>, TIn, TOut>(
	trigger: Trigger<TRaw, TIn>,
	adapt: (output: TIn) => TOut,
): Trigger<TRaw, TOut> => ({
	capabilityId: () => trigger.capabilityId(),
	method: () => trigger.method(),
	outputSchema: () => trigger.outputSchema(),
	configAsAny: () => trigger.configAsAny(),
	adapt: (rawOutput) => adapt(trigger.adapt(rawOutput)),
})
