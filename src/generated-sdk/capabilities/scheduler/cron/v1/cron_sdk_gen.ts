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
  LegacyPayloadSchema,
  PayloadSchema,
  type ConfigJson,
  type LegacyPayload,
  type Payload,
} from "@cre/generated/capabilities/scheduler/cron/v1/trigger_pb";

/**
 * Cron Capability
 * 
 * Capability ID: cron-trigger@1.0.0
 * Default Mode: Mode.DON
 * Capability Name: cron-trigger
 * Capability Version: 1.0.0
 */
export class CronCapability {
  /** The capability ID for this service */
  static readonly CAPABILITY_ID = "cron-trigger@1.0.0";
  
  /** The default execution mode for this capability */
  static readonly DEFAULT_MODE = Mode.DON;

  static readonly CAPABILITY_NAME = "cron-trigger";
  static readonly CAPABILITY_VERSION = "1.0.0";


  constructor(
    private readonly mode: Mode = CronCapability.DEFAULT_MODE
  ) {}

  trigger(config: ConfigJson): CronTrigger {
    return new CronTrigger(this.mode, config, CronCapability.CAPABILITY_ID, "Trigger");
  }

  // Method legacyTrigger is mapped to untyped API
}

/**
 * Trigger implementation for Trigger
 */
class CronTrigger extends BaseTriggerImpl<ConfigJson, Payload> {
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

/**
 * Trigger implementation for LegacyTrigger
 */
class CronLegacyTrigger extends BaseTriggerImpl<ConfigJson, LegacyPayload> {
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

  newOutput(): LegacyPayload {
    return create(LegacyPayloadSchema);
  }

  outputSchema() {
    return LegacyPayloadSchema;
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
  adapt(output: LegacyPayload): LegacyPayload {
    return output;
  }
}