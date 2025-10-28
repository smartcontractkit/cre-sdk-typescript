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

export type ConfigHandlerParams<TConfig, TIntermediateConfig = TConfig> = {
	configParser?: (config: Uint8Array) => TIntermediateConfig
	configSchema?: StandardSchemaV1<TIntermediateConfig, TConfig>
}

const defaultJsonParser = (config: Uint8Array) => JSON.parse(Buffer.from(config).toString())

export const configHandler = async <TConfig, TIntermediateConfig = TConfig>(
	request: ExecuteRequest,
	{ configParser, configSchema }: ConfigHandlerParams<TConfig, TIntermediateConfig> = {},
): Promise<TConfig> => {
	const config = request.config
	const parser = configParser || defaultJsonParser

	let intermediateConfig: TIntermediateConfig
	try {
		intermediateConfig = parser(config)
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(`Failed to parse configuration: ${error.message}`)
		} else {
			throw new Error(`Failed to parse configuration: unknown error`)
		}
	}

	return configSchema
		? standardValidate(configSchema, intermediateConfig)
		: (intermediateConfig as unknown as TConfig)
}
