import type { Message } from '@bufbuild/protobuf'
import type {
	Requirements,
	Secret,
	SecretRequest,
	SecretRequestJson,
} from '@cre/generated/sdk/v1alpha/sdk_pb'
import type { Runtime, TeeRuntime } from '@cre/sdk/runtime'
import type { Trigger } from '@cre/sdk/utils/triggers/trigger-interface'
import type { CreSerializable } from './utils'

export type { TeeConstraint, AnyTeeConstraint, OneOfTees, TeeBinding, NitroBinding } from './tee-constraints'
export { buildTeeRequirements, REGIONS, NITRO_REGIONS, teeConstraintSchema } from './tee-constraints'
export type { Region, NitroRegion } from './tee-constraints'
import type { TeeConstraint } from './tee-constraints'
import { buildTeeRequirements } from './tee-constraints'

export type HandlerFn<TConfig, TTriggerOutput, TResult, TRuntime = Runtime<TConfig>> = (
	runtime: TRuntime,
	triggerOutput: TTriggerOutput,
) => Promise<CreSerializable<TResult>> | CreSerializable<TResult>

export interface HandlerEntry<
	TConfig,
	TRawTriggerOutput extends Message<string>,
	TTriggerOutput,
	TResult,
	TRuntime = Runtime<TConfig>,
> {
	trigger: Trigger<TRawTriggerOutput, TTriggerOutput>
	fn: HandlerFn<TConfig, TTriggerOutput, TResult, TRuntime>
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
): HandlerEntry<TConfig, TRawTriggerOutput, TTriggerOutput, TResult, TRuntime> => ({
	trigger,
	fn,
})

export const handlerInTee = <
	TRawTriggerOutput extends Message<string>,
	TTriggerOutput,
	TConfig,
	TResult,
>(
	trigger: Trigger<TRawTriggerOutput, TTriggerOutput>,
	fn: HandlerFn<TConfig, TTriggerOutput, TResult, TeeRuntime<TConfig>>,
	tees: TeeConstraint,
): HandlerEntry<TConfig, TRawTriggerOutput, TTriggerOutput, TResult, TeeRuntime<TConfig>> => ({
	trigger,
	fn,
	requirements: buildTeeRequirements(tees),
})

export type SecretsProvider = {
	getSecret(request: SecretRequest | SecretRequestJson): {
		result: () => Secret
	}
}
