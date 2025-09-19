import { fromJson, create } from "@bufbuild/protobuf"
import { type Trigger } from "@cre/sdk/utils/triggers/trigger-interface"
import { type Any, AnySchema, anyPack } from "@bufbuild/protobuf/wkt"
import { type Runtime } from "@cre/sdk/runtime/runtime"
import {
  ConfigSchema,
  InputSchema,
  OutputSchema,
  TriggerEventSchema,
  type Config,
  type ConfigJson,
  type Input,
  type InputJson,
  type Output,
  type TriggerEvent,
} from "@cre/generated/capabilities/internal/actionandtrigger/v1/action_and_trigger_pb"

/**
 * Basic Capability
 * 
 * Capability ID: basic-test-action-trigger@1.0.0
 * Capability Name: basic-test-action-trigger
 * Capability Version: 1.0.0
 */
export class BasicCapability {
  /** The capability ID for this service */
  static readonly CAPABILITY_ID = "basic-test-action-trigger@1.0.0";

  static readonly CAPABILITY_NAME = "basic-test-action-trigger";
  static readonly CAPABILITY_VERSION = "1.0.0";


  constructor(
    
  ) {}

  async action(runtime: Runtime<any>, input: Input |  InputJson): Promise<Output> {
    // biome-ignore lint/suspicious/noExplicitAny: Needed for runtime type checking of protocol buffer messages
    const payload = (input as any).$typeName ? input as Input : fromJson(InputSchema, input as InputJson)
    
    
    const capabilityId = BasicCapability.CAPABILITY_ID;
    
    return runtime.callCapability<Input, Output>({
      capabilityId,
      method: "Action",
      payload,
      inputSchema: InputSchema,
      outputSchema: OutputSchema
    })
  }

  trigger(config: ConfigJson): BasicTrigger {
    return new BasicTrigger(config, BasicCapability.CAPABILITY_ID, "Trigger");
  }
}

/**
 * Trigger implementation for Trigger
 */
class BasicTrigger implements Trigger<TriggerEvent, TriggerEvent> {
  public readonly config: Config
  constructor(
    config: Config | ConfigJson,
    private readonly _capabilityId: string,
    private readonly _method: string
  ) {
    // biome-ignore lint/suspicious/noExplicitAny: Needed for runtime type checking of protocol buffer messages
    this.config = (config as any).$typeName ? config as Config : fromJson(ConfigSchema, config as ConfigJson)
  }

  capabilityId(): string {
    return this._capabilityId;
  }

  method(): string {
    return this._method;
  }

  outputSchema() {
    return TriggerEventSchema;
  }

  configAsAny(): Any {
    return anyPack(ConfigSchema, this.config);
  }

  /**
   * Transform the raw trigger output - override this method if needed
   * Default implementation returns the raw output unchanged
   */
  adapt(rawOutput: TriggerEvent): TriggerEvent {
    return rawOutput;
  }
}