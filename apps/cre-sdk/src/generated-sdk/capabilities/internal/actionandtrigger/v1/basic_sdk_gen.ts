import { fromBinary, toBinary, fromJson, create } from '@bufbuild/protobuf'
import { Mode, type CapabilityResponse } from '@cre/generated/sdk/v1alpha/sdk_pb'
import { callCapability } from '@cre/sdk/utils/capabilities/call-capability'
import { CapabilityError } from '@cre/sdk/utils/capabilities/capability-error'
import { type Trigger } from '@cre/sdk/utils/triggers/trigger-interface'
import { type Any, AnySchema } from '@bufbuild/protobuf/wkt'
import { getTypeUrl } from '@cre/sdk/utils/typeurl'
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
} from '@cre/generated/capabilities/internal/actionandtrigger/v1/action_and_trigger_pb'

/**
 * Basic Capability
 *
 * Capability ID: basic-test-action-trigger@1.0.0
 * Default Mode: Mode.DON
 * Capability Name: basic-test-action-trigger
 * Capability Version: 1.0.0
 */
export class BasicCapability {
	/** The capability ID for this service */
	static readonly CAPABILITY_ID = 'basic-test-action-trigger@1.0.0'

	/** The default execution mode for this capability */
	static readonly DEFAULT_MODE = Mode.DON

	static readonly CAPABILITY_NAME = 'basic-test-action-trigger'
	static readonly CAPABILITY_VERSION = '1.0.0'

	constructor(private readonly mode: Mode = BasicCapability.DEFAULT_MODE) {}

	async action(input: Input | InputJson): Promise<Output> {
		// biome-ignore lint/suspicious/noExplicitAny: Needed for runtime type checking of protocol buffer messages
		const value = (input as any).$typeName
			? (input as Input)
			: fromJson(InputSchema, input as InputJson)
		const payload = {
			typeUrl: getTypeUrl(InputSchema),
			value: toBinary(InputSchema, value),
		}
		const capabilityId = BasicCapability.CAPABILITY_ID

		return callCapability({
			capabilityId,
			method: 'Action',
			mode: this.mode,
			payload,
		}).then((capabilityResponse: CapabilityResponse) => {
			if (capabilityResponse.response.case === 'error') {
				throw new CapabilityError(capabilityResponse.response.value, {
					capabilityId,
					method: 'Action',
					mode: this.mode,
				})
			}

			if (capabilityResponse.response.case !== 'payload') {
				throw new CapabilityError('No payload in response', {
					capabilityId,
					method: 'Action',
					mode: this.mode,
				})
			}

			return fromBinary(OutputSchema, capabilityResponse.response.value.value)
		})
	}

	trigger(config: ConfigJson): BasicTrigger {
		return new BasicTrigger(this.mode, config, BasicCapability.CAPABILITY_ID, 'Trigger')
	}
}

/**
 * Trigger implementation for Trigger
 */
class BasicTrigger implements Trigger<TriggerEvent, TriggerEvent> {
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
		return TriggerEventSchema
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
	adapt(rawOutput: TriggerEvent): TriggerEvent {
		return rawOutput
	}
}
