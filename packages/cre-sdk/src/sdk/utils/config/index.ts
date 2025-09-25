import type { ExecuteRequest } from '@cre/generated/sdk/v1alpha/sdk_pb'
import type { StandardSchemaV1 } from '@standard-schema/spec'

async function standardValidate<TIntermediateConfig, TConfig>(
	schema: StandardSchemaV1<TIntermediateConfig, TConfig>,
	input: TIntermediateConfig,
): Promise<TConfig> {
	let result = schema['~standard'].validate(input)
	if (result instanceof Promise) result = await result

	/**
	 * If the `issues` field exists, the validation failed
	 * @see https://github.com/standard-schema/standard-schema?tab=readme-ov-file#how-do-i-accept-standard-schemas-in-my-library
	 */
	if (result.issues) {
		throw new Error(JSON.stringify(result.issues, null, 2))
	}

	return result.value
}

export type ConfigHandlerParams<
	TConfig,
	TIntermediateConfig = TConfig,
> = (TIntermediateConfig extends Uint8Array
	? {
			configParser?: (config: Uint8Array) => TIntermediateConfig
		}
	: {
			configParser: (config: Uint8Array) => TIntermediateConfig
		}) &
	(TIntermediateConfig extends TConfig
		? {
				configSchema?: StandardSchemaV1<TIntermediateConfig, TConfig>
			}
		: {
				configSchema: StandardSchemaV1<TIntermediateConfig, TConfig>
			})

export const configHandler = async <TConfig, TIntermediateConfig = TConfig>(
	{ configParser, configSchema }: ConfigHandlerParams<TConfig, TIntermediateConfig>,
	request: ExecuteRequest,
): Promise<TConfig> => {
	const config = request.config
	const intermediateConfig = configParser ? configParser(config) : (config as TIntermediateConfig)
	return configSchema
		? standardValidate(configSchema, intermediateConfig)
		: (intermediateConfig as unknown as TConfig)
}
