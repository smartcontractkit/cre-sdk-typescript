import { fromBinary, toBinary, fromJson, create } from "@bufbuild/protobuf";
import {
  Mode,
  type CapabilityResponse,
} from "@cre/generated/sdk/v1alpha/sdk_pb";
import { callCapability } from "@cre/sdk/utils/capabilities/call-capability";
import { CapabilityError } from "@cre/sdk/utils/capabilities/capability-error";
import { BaseTriggerImpl } from "@cre/sdk/utils/triggers/trigger-interface";
import { type Any, AnySchema } from "@bufbuild/protobuf/wkt";
import { getTypeUrl } from "@cre/sdk/utils/typeurl";
import {
  ConfigSchema,
  OutputsSchema,
  type ConfigJson,
  type Outputs,
} from "@cre/generated/capabilities/internal/basictrigger/v1/basic_trigger_pb";

/**
 * Basic Capability
 * 
 * Capability ID: basic-test-trigger@1.0.0
 * Default Mode: Mode.DON
 * Capability Name: basic-test-trigger
 * Capability Version: 1.0.0
 */
export class BasicCapability {
  /** The capability ID for this service */
  static readonly CAPABILITY_ID = "basic-test-trigger@1.0.0";
  
  /** The default execution mode for this capability */
  static readonly DEFAULT_MODE = Mode.DON;

  static readonly CAPABILITY_NAME = "basic-test-trigger";
  static readonly CAPABILITY_VERSION = "1.0.0";


  constructor(
    private readonly mode: Mode = BasicCapability.DEFAULT_MODE
  ) {}

  trigger(config: ConfigJson): BasicTrigger {
    return new BasicTrigger(this.mode, config, BasicCapability.CAPABILITY_ID, "Trigger");
  }
}

/**
 * Trigger implementation for Trigger
 */
class BasicTrigger extends BaseTriggerImpl<ConfigJson, Outputs> {
  constructor(
    mode: Mode,
    config: ConfigJson,
    private readonly _capabilityId: string,
    private readonly _method: string
  ) {
    super(mode, config);
  }

  capabilityId(): string {
    return this._capabilityId;
  }

  method(): string {
    return this._method;
  }

  newOutput(): Outputs {
    return create(OutputsSchema);
  }

  outputSchema() {
    return OutputsSchema;
  }

  configAsAny(): Any {
    const configMessage = fromJson(ConfigSchema, this.config);
    return create(AnySchema, {
      typeUrl: getTypeUrl(ConfigSchema),
      value: toBinary(ConfigSchema, configMessage),
    });
  }

  /**
   * Transform the trigger output - override this method if needed
   * Default implementation returns the output unchanged
   */
  adapt(output: Outputs): Outputs {
    return output;
  }
}