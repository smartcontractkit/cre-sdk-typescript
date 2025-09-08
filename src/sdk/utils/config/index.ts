import type { StandardSchemaV1 } from '@standard-schema/spec'
import type { ExecuteRequest } from '@cre/generated/sdk/v1alpha/sdk_pb'
import { getRequest } from '../get-request'

export const getConfigFromExecuteRequest = (executeRequest: ExecuteRequest) => {
	const config = executeRequest.config
	const configString = Buffer.from(config).toString()

	try {
		return JSON.parse(configString)
	} catch (e) {
		if (typeof configString === 'string') {
			return configString
		}

		if (e instanceof Error) {
			console.error(e.message)
			console.error(e.stack)
		}

		throw e
	}
}

export const getConfig = () => {
	const executeRequest: ExecuteRequest = getRequest()
	return getConfigFromExecuteRequest(executeRequest)
}

const standardValidate = async <T extends StandardSchemaV1>(
	schema: T,
	input: StandardSchemaV1.InferInput<T>,
): Promise<StandardSchemaV1.InferOutput<T>> => {
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

export type ConfigHandlerParams = {
	configParser?: (config: unknown) => unknown
	configSchema?: StandardSchemaV1
}
export const configHandler = async <TConfig>({
	configParser,
	configSchema,
}: ConfigHandlerParams = {}): Promise<TConfig> => {
	const config = getConfig()
	let parsedConfig = config

	if (configParser) {
		parsedConfig = configParser(config)
	}

	if (configSchema) {
		parsedConfig = await standardValidate(configSchema, parsedConfig)
	}

	return parsedConfig
}
