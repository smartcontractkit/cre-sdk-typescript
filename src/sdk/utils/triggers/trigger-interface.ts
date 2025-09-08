import type { Any } from '@bufbuild/protobuf/wkt'
import type { Message } from '@bufbuild/protobuf'
import type { GenMessage } from '@bufbuild/protobuf/codegenv2'

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
	adapt(rawOutput: TRawTriggerOutput): TTriggerOutput | Promise<TTriggerOutput>
}
