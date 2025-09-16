import { fromBinary, toBinary, fromJson, create } from "@bufbuild/protobuf";
import {
  Mode,
  type CapabilityResponse,
} from "@cre/generated/sdk/v1alpha/sdk_pb";
import { callCapability } from "@cre/sdk/utils/capabilities/call-capability";
import { CapabilityError } from "@cre/sdk/utils/capabilities/capability-error";
import { type Trigger } from "@cre/sdk/utils/triggers/trigger-interface";
import { type Any, AnySchema } from "@bufbuild/protobuf/wkt";
import { getTypeUrl } from "@cre/sdk/utils/typeurl";
import {
  ConfigSchema,
  LegacyPayloadSchema,
  PayloadSchema,
  type Config,
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
}

/**
 * Trigger implementation for Trigger
 */
class CronTrigger implements Trigger<Payload, Payload> {
  public readonly config: Config
  constructor(
    public readonly mode: Mode,
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
    return PayloadSchema;
  }

  configAsAny(): Any {
    return create(AnySchema, {
      typeUrl: getTypeUrl(ConfigSchema),
      value: toBinary(ConfigSchema, this.config),
    });
  }

  /**
   * Transform the raw trigger output - override this method if needed
   * Default implementation returns the raw output unchanged
   */
  adapt(rawOutput: Payload): Payload {
    return rawOutput;
  }
}