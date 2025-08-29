import type { Mode } from "@cre/generated/sdk/v1alpha/sdk_pb";
import type { Any } from "@bufbuild/protobuf/wkt";
import type { Message } from "@bufbuild/protobuf";
import type { GenMessage } from "@bufbuild/protobuf/codegenv2";

/**
 * Base interface for trigger capabilities in the CRE SDK
 *
 * Triggers are server-streaming RPC methods that emit events
 * to the workflow runtime.
 */
export interface BaseTrigger<TRawTriggerOutput extends Message<string>> {
  /** The capability ID for this trigger */
  capabilityId(): string;

  /** The method name for this trigger */
  method(): string;

  /** Create a new instance of the raw output type */
  newOutput(): TRawTriggerOutput;

  /** Access the raw output schema for decoding */
  outputSchema(): GenMessage<TRawTriggerOutput>;

  /** Get the configuration as an Any type for protobuf serialization */
  configAsAny(): Any;
}

/**
 * Full trigger interface with adapt method
 *
 * The adapt method allows transformation of the raw protobuf output
 * to a more convenient type for the workflow.
 */
export interface Trigger<
  TRawTriggerOutput extends Message<string>,
  TTriggerOutput = TRawTriggerOutput
> extends BaseTrigger<TRawTriggerOutput> {
  /** Transform the raw trigger output to the adapted type */
  adapt(rawOutput: TRawTriggerOutput): TTriggerOutput | Promise<TTriggerOutput>;
}

/**
 * Base class for trigger implementations
 */
export abstract class BaseTriggerImpl<
  TConfig,
  TRawTriggerOutput extends Message<string>,
  TTriggerOutput = TRawTriggerOutput
> implements Trigger<TRawTriggerOutput, TTriggerOutput>
{
  constructor(public readonly mode: Mode, public readonly config: TConfig) {}

  abstract capabilityId(): string;
  abstract method(): string;
  abstract newOutput(): TRawTriggerOutput;
  abstract outputSchema(): GenMessage<TRawTriggerOutput>;

  /** Go naming parity */
  abstract configAsAny(): Any;

  /**
   * Default adapt implementation - returns raw output unchanged
   * Override this method to transform the raw output to your desired type
   */
  adapt(
    rawOutput: TRawTriggerOutput
  ): TTriggerOutput | Promise<TTriggerOutput> {
    // Type assertion is safe here as TTriggerOutput defaults to TRawTriggerOutput
    // when not explicitly specified
    return rawOutput as unknown as TTriggerOutput;
  }
}
