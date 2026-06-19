import { create, fromJson } from '@bufbuild/protobuf'
import { type Any, AnySchema, anyPack } from '@bufbuild/protobuf/wkt'
import {
	type Config,
	type ConfigJson,
	ConfigSchema,
	type Outputs,
	OutputsSchema,
} from '@cre/generated/capabilities/internal/basictrigger/v1/basic_trigger_pb'
import type { Trigger } from '@cre/sdk/utils/triggers/trigger-interface'
import type { NoExcess } from '@cre/sdk/utils/types/no-excess'

/**
 * Basic Capability
 *
 * Capability ID: basic-test-trigger@1.0.0
 * Capability Name: basic-test-trigger
 * Capability Version: 1.0.0
 */
export class BasicCapability {
	/** The capability ID for this service */
	static readonly CAPABILITY_ID = 'basic-test-trigger@1.0.0'

	static readonly CAPABILITY_NAME = 'basic-test-trigger'
	static readonly CAPABILITY_VERSION = '1.0.0'

	trigger<TConfig extends ConfigJson>(config: NoExcess<TConfig, ConfigJson>): BasicTrigger {
		const capabilityId = BasicCapability.CAPABILITY_ID
		return new BasicTrigger(config as ConfigJson, capabilityId, 'Trigger')
	}
}

/**
 * Trigger implementation for Trigger
 */
class BasicTrigger implements Trigger<Outputs, Outputs> {
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
		return OutputsSchema
	}

	configAsAny(): Any {
		return anyPack(ConfigSchema, this.config)
	}

	/**
	 * Transform the raw trigger output - override this method if needed
	 * Default implementation returns the raw output unchanged
	 */
	adapt(rawOutput: Outputs): Outputs {
		return rawOutput
	}
}
