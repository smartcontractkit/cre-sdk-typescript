import type { Message } from '@bufbuild/protobuf'
import { create } from '@bufbuild/protobuf'
import { EmptySchema } from '@bufbuild/protobuf/wkt'
import type {
	Requirements,
	RestrictionsJson,
	Secret,
	SecretRequest,
	SecretRequestJson,
	TeeType,
} from '@cre/generated/sdk/v1alpha/sdk_pb'
import { RequirementsSchema, TeeSchema } from '@cre/generated/sdk/v1alpha/sdk_pb'
import type { Runtime, TeeRuntime } from '@cre/sdk/runtime'
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
	requirements?: Requirements
}

export type Workflow<TConfig> = ReadonlyArray<HandlerEntry<TConfig, any, any, any, any>>

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

export const handlerInTee = <
	TRawTriggerOutput extends Message<string>,
	TTriggerOutput,
	TConfig,
	TResult,
>(
	trigger: Trigger<TRawTriggerOutput, TTriggerOutput>,
	fn: HandlerFn<TConfig, TTriggerOutput, TResult, TeeRuntime<TConfig>>,
	tees: (TeeType | { type: TeeType; regions: string[] })[] | 'any',
): HandlerEntry<TConfig, TRawTriggerOutput, TTriggerOutput, TResult, TeeRuntime<TConfig>> => ({
	trigger,
	fn,
	requirements: buildTeeRequirements(tees),
})

function buildTeeRequirements(
	tees: (TeeType | { type: TeeType; regions: string[] })[] | 'any',
): Requirements {
	if (tees === 'any') {
		return create(RequirementsSchema, {
			tee: create(TeeSchema, { type: { case: 'any', value: create(EmptySchema, {}) } }),
		})
	}
	const teeTypes = tees.map((tee) => {
		if (typeof tee === 'object') {
			return { type: tee.type, regions: tee.regions }
		}
		return { type: tee, regions: [] as string[] }
	})
	return create(RequirementsSchema, {
		tee: create(TeeSchema, { type: { case: 'typeSelection', value: { types: teeTypes } } }),
	})
}

export type SecretsProvider = {
	getSecrets(requests: Array<SecretRequest | SecretRequestJson>): {
		result: () => Record<string, Secret>
	}
	getSecret(request: SecretRequest | SecretRequestJson): {
		result: () => Secret
	}
}
