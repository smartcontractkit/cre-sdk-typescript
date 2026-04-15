import type { Message } from '@bufbuild/protobuf'
import type {
	RestrictionsJson,
	Secret,
	SecretRequest,
	SecretRequestJson,
} from '@cre/generated/sdk/v1alpha/sdk_pb'
import type { Runtime } from '@cre/sdk/runtime'
import type { Trigger } from '@cre/sdk/utils/triggers/trigger-interface'
import type { CreSerializable } from './utils'

export type HandlerFn<TConfig, TTriggerOutput, TResult, TRuntime = Runtime<TConfig>> = (
	runtime: TRuntime,
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
	TRuntime = Runtime<TConfig>,
> {
	trigger: Trigger<TRawTriggerOutput, TTriggerOutput>
	fn: HandlerFn<TConfig, TTriggerOutput, TResult, TRuntime>
	hooks?: Hooks<TConfig, TTriggerOutput>
}

export type Workflow<TConfig, TRuntime = Runtime<TConfig>> = ReadonlyArray<
	HandlerEntry<TConfig, any, any, any, TRuntime>
>

export const handler = <
	TRawTriggerOutput extends Message<string>,
	TTriggerOutput,
	TConfig,
	TResult,
	TRuntime = Runtime<TConfig>,
>(
	trigger: Trigger<TRawTriggerOutput, TTriggerOutput>,
	fn: HandlerFn<TConfig, TTriggerOutput, TResult, TRuntime>,
	hooks?: Hooks<TConfig, TTriggerOutput>,
): HandlerEntry<TConfig, TRawTriggerOutput, TTriggerOutput, TResult, TRuntime> => ({
	trigger,
	fn,
	hooks,
})

export type SecretsProvider = {
	getSecrets(requests: Array<SecretRequest | SecretRequestJson>): {
		result: () => Record<string, Secret>
	}
	getSecret(request: SecretRequest | SecretRequestJson): {
		result: () => Secret
	}
}
