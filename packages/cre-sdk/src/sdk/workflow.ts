import type { Message } from '@bufbuild/protobuf'
import type {
	CapabilityResponse,
	RestrictionsJson,
	Secret,
	SecretRequest,
	SecretRequestJson,
} from '@cre/generated/sdk/v1alpha/sdk_pb'
import { type Runtime } from '@cre/sdk/runtime'
import type { Trigger } from '@cre/sdk/utils/triggers/trigger-interface'
import type { SecretsError } from './errors'
import type { CreSerializable } from './utils'

export type HandlerFn<TConfig, TTriggerOutput, TResult> = (
	runtime: Runtime<TConfig>,
	triggerOutput: TTriggerOutput,
) => Promise<CreSerializable<TResult>> | CreSerializable<TResult>

export interface Hooks<TConfig, TTriggerOutput> {
	preHook?: (config: TConfig, triggerOutput: TTriggerOutput) => RestrictionsJson
}

export interface HandlerEntry<
	TConfig,
	TRawTriggerOutput extends Message<string>,
	TTriggerOutput,
	TResult,
> {
	trigger: Trigger<TRawTriggerOutput, TTriggerOutput>
	fn: HandlerFn<TConfig, TTriggerOutput, TResult>
	hooks?: Hooks<TConfig, TTriggerOutput>
}

export type Workflow<TConfig> = ReadonlyArray<HandlerEntry<TConfig, any, any, any>>

export const handler = <
	TRawTriggerOutput extends Message<string>,
	TTriggerOutput,
	TConfig,
	TResult,
>(
	trigger: Trigger<TRawTriggerOutput, TTriggerOutput>,
	fn: HandlerFn<TConfig, TTriggerOutput, TResult>,
	hooks?: Hooks<TConfig, TTriggerOutput>,
): HandlerEntry<TConfig, TRawTriggerOutput, TTriggerOutput, TResult> => ({
	trigger,
	fn,
	hooks,
})

export type SecretsProvider = {
	getSecret(request: SecretRequest | SecretRequestJson): {
		result: () => Secret
	}
}
