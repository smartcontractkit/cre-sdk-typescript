import type { Message } from '@bufbuild/protobuf'
import { create } from '@bufbuild/protobuf'
import type {
	Requirements,
	Secret,
	SecretRequest,
	SecretRequestJson,
	TeeType,
} from '@cre/generated/sdk/v1alpha/sdk_pb'
import { RegionsSchema, RequirementsSchema, TeeSchema } from '@cre/generated/sdk/v1alpha/sdk_pb'
import type { TeeRuntime } from '@cre/sdk/runtime'
import { type Runtime } from '@cre/sdk/runtime'
import type { Trigger } from '@cre/sdk/utils/triggers/trigger-interface'
import type { CreSerializable } from './utils'

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

export type TeeRequirement = { type: TeeType; regions?: string[] }
export type AnyTeeRequirement = { type: 'any'; regions?: string[] }
export type AcceptedTees = TeeRequirement[] | AnyTeeRequirement

export const handlerInTee = <
	TRawTriggerOutput extends Message<string>,
	TTriggerOutput,
	TConfig,
	TResult,
>(
	trigger: Trigger<TRawTriggerOutput, TTriggerOutput>,
	fn: HandlerFn<TConfig, TTriggerOutput, TResult, TeeRuntime<TConfig>>,
	tees: AcceptedTees,
): HandlerEntry<TConfig, TRawTriggerOutput, TTriggerOutput, TResult, TeeRuntime<TConfig>> => ({
	trigger,
	fn,
	requirements: buildTeeRequirements(tees),
})

function buildTeeRequirements(tees: AcceptedTees): Requirements {
	if (!Array.isArray(tees)) {
		return create(RequirementsSchema, {
			tee: create(TeeSchema, {
				item: {
					case: 'anyRegions',
					value: create(RegionsSchema, { regions: tees.regions ?? [] }),
				},
			}),
		})
	}
	const teeTypes = tees.map((tee) => ({
		type: tee.type,
		regions: tee.regions ?? [],
	}))
	return create(RequirementsSchema, {
		tee: create(TeeSchema, {
			item: { case: 'teeTypesAndRegions', value: { teeTypeAndRegions: teeTypes } },
		}),
	})
}

export type SecretsProvider = {
	getSecret(request: SecretRequest | SecretRequestJson): {
		result: () => Secret
	}
}
