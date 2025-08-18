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
  PayloadSchema,
  type ConfigJson,
  type Payload,
} from "@cre/generated/capabilities/networking/http/v1alpha/trigger_pb";

/**
 * HTTP Capability
 * 
 * Capability ID: http-trigger@1.0.0-alpha
 * Default Mode: Mode.DON
 */
export class HTTPCapability {
  /** The capability ID for this service */
  static readonly CAPABILITY_ID = "http-trigger@1.0.0-alpha";
  
  /** The default execution mode for this capability */
  static readonly DEFAULT_MODE = Mode.DON;

  constructor(
    private readonly mode: Mode = HTTPCapability.DEFAULT_MODE
  ) {}

  trigger(config: ConfigJson): HTTPTrigger {
    return new HTTPTrigger(this.mode, config, HTTPCapability.CAPABILITY_ID, "Trigger");
  }
}

/**
 * Trigger implementation for Trigger
 */
class HTTPTrigger extends BaseTriggerImpl<ConfigJson, Payload> {
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

  newOutput(): Payload {
    return create(PayloadSchema);
  }

  outputSchema() {
    return PayloadSchema;
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
  adapt(output: Payload): Payload {
    return output;
  }
}