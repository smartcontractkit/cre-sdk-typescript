import { create, fromBinary, fromJson, toBinary } from '@bufbuild/protobuf'
import { type Any, AnySchema } from '@bufbuild/protobuf/wkt'
import {
	type Config,
	type ConfigJson,
	ConfigSchema,
	type Payload,
	PayloadSchema,
} from '@cre/generated/capabilities/networking/http/v1alpha/trigger_pb'
import { type CapabilityResponse, Mode } from '@cre/generated/sdk/v1alpha/sdk_pb'
import { callCapability } from '@cre/sdk/utils/capabilities/call-capability'
import { CapabilityError } from '@cre/sdk/utils/capabilities/capability-error'
import { type Trigger } from '@cre/sdk/utils/triggers/trigger-interface'
import { getTypeUrl } from '@cre/sdk/utils/typeurl'

/**
 * HTTP Capability
 *
 * Capability ID: http-trigger@1.0.0-alpha
 * Default Mode: Mode.DON
 * Capability Name: http-trigger
 * Capability Version: 1.0.0-alpha
 */
export class HTTPCapability {
	/** The capability ID for this service */
	static readonly CAPABILITY_ID = 'http-trigger@1.0.0-alpha'

	/** The default execution mode for this capability */
	static readonly DEFAULT_MODE = Mode.DON

	static readonly CAPABILITY_NAME = 'http-trigger'
	static readonly CAPABILITY_VERSION = '1.0.0-alpha'

	constructor(private readonly mode: Mode = HTTPCapability.DEFAULT_MODE) {}

	trigger(config: ConfigJson): HTTPTrigger {
		return new HTTPTrigger(this.mode, config, HTTPCapability.CAPABILITY_ID, 'Trigger')
	}
}

/**
 * Trigger implementation for Trigger
 */
class HTTPTrigger implements Trigger<Payload, Payload> {
	public readonly config: Config
	constructor(
		public readonly mode: Mode,
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
		return create(AnySchema, {
			typeUrl: getTypeUrl(ConfigSchema),
			value: toBinary(ConfigSchema, this.config),
		})
	}

	/**
	 * Transform the raw trigger output - override this method if needed
	 * Default implementation returns the raw output unchanged
	 */
	adapt(rawOutput: Payload): Payload {
		return rawOutput
	}
}
