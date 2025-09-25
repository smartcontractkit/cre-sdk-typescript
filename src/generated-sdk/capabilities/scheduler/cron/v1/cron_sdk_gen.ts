import { fromJson, create } from '@bufbuild/protobuf'
import { type Trigger } from '@cre/sdk/utils/triggers/trigger-interface'
import { type Any, AnySchema, anyPack } from '@bufbuild/protobuf/wkt'
import { type Runtime } from '@cre/sdk/runtime/runtime'
import {
	ConfigSchema,
	LegacyPayloadSchema,
	PayloadSchema,
	type Config,
	type ConfigJson,
	type LegacyPayload,
	type Payload,
} from '@cre/generated/capabilities/scheduler/cron/v1/trigger_pb'

/**
 * Cron Capability
 *
 * Capability ID: cron-trigger@1.0.0
 * Capability Name: cron-trigger
 * Capability Version: 1.0.0
 */
export class CronCapability {
	/** The capability ID for this service */
	static readonly CAPABILITY_ID = 'cron-trigger@1.0.0'

	static readonly CAPABILITY_NAME = 'cron-trigger'
	static readonly CAPABILITY_VERSION = '1.0.0'

	constructor() {}

	trigger(config: ConfigJson): CronTrigger {
		const capabilityId = CronCapability.CAPABILITY_ID
		return new CronTrigger(config, capabilityId, 'Trigger')
	}
}

/**
 * Trigger implementation for Trigger
 */
class CronTrigger implements Trigger<Payload, Payload> {
	public readonly config: Config
	constructor(
		config: Config | ConfigJson,
		private readonly _capabilityId: string,
		private readonly _method: string,
	) {
		// biome-ignore lint/suspicious/noExplicitAny: Needed for runtime type checking of protocol buffer messages
		this.config = (config as any).$typeName
			? (config as Config)
			: fromJson(ConfigSchema, config as ConfigJson)
	}

	capabilityId(): string {
		return this._capabilityId
	}

	method(): string {
		return this._method
	}

	outputSchema() {
		return PayloadSchema
	}

	configAsAny(): Any {
		return anyPack(ConfigSchema, this.config)
	}

	/**
	 * Transform the raw trigger output - override this method if needed
	 * Default implementation returns the raw output unchanged
	 */
	adapt(rawOutput: Payload): Payload {
		return rawOutput
	}
}
