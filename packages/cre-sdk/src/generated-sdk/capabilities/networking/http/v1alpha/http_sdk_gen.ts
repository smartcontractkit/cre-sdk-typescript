import { create, fromJson } from '@bufbuild/protobuf'
import { type Any, AnySchema, anyPack } from '@bufbuild/protobuf/wkt'
import {
	type Config,
	type ConfigJson,
	ConfigSchema,
	type Payload,
	PayloadSchema,
} from '@cre/generated/capabilities/networking/http/v1alpha/trigger_pb'
import type { Runtime } from '@cre/sdk/runtime'
import { type Trigger } from '@cre/sdk/utils/triggers/trigger-interface'

/**
 * HTTP Capability
 *
 * Capability ID: http-trigger@1.0.0-alpha
 * Capability Name: http-trigger
 * Capability Version: 1.0.0-alpha
 */
export class HTTPCapability {
	/** The capability ID for this service */
	static readonly CAPABILITY_ID = 'http-trigger@1.0.0-alpha'

	static readonly CAPABILITY_NAME = 'http-trigger'
	static readonly CAPABILITY_VERSION = '1.0.0-alpha'

	constructor() {}

	trigger(config: ConfigJson): HTTPTrigger {
		const capabilityId = HTTPCapability.CAPABILITY_ID
		return new HTTPTrigger(config, capabilityId, 'Trigger')
	}
}

/**
 * Trigger implementation for Trigger
 */
class HTTPTrigger implements Trigger<Payload, Payload> {
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
