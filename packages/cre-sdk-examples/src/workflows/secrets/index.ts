import {
	consensusIdenticalAggregation,
	cre,
	decodeJson,
	type HTTPPayload,
	type HTTPSendRequester,
	json,
	ok,
	Runner,
	type Runtime,
} from '@chainlink/cre-sdk'
import { z } from 'zod'

const configSchema = z.object({
	url: z.string(),
})

type Config = z.infer<typeof configSchema>

const responseSchema = z.object({
	name: z.string(),
	height: z.string(),
	mass: z.string(),
	hair_color: z.string(),
	skin_color: z.string(),
	eye_color: z.string(),
	birth_year: z.string(),
	gender: z.string(),
	homeworld: z.string(),
	films: z.array(z.string()),
	species: z.array(z.string()),
	vehicles: z.array(z.string()),
	starships: z.array(z.string()),
	created: z.string().datetime(),
	edited: z.string().datetime(),
	url: z.string(),
})

type StarWarsCharacter = z.infer<typeof responseSchema>

const fetchStarWarsCharacter = (
	sendRequester: HTTPSendRequester,
	config: Config,
	characterId: string,
): StarWarsCharacter => {
	const url = config.url.replace('{characterId}', characterId)
	const response = sendRequester.sendRequest({ url, method: 'GET' }).result()

	// Check if the response is successful using the helper function
	if (!ok(response)) {
		throw new Error(`HTTP request failed with status: ${response.statusCode}`)
	}

	const character = responseSchema.parse(json(response))

	return character
}

const onHTTPTrigger = async (runtime: Runtime<Config>) => {
	const httpCapability = new cre.capabilities.HTTPClient()
	const characterId = runtime.getSecret({ id: 'CHARACTER_ID' }).result().value

	const result: StarWarsCharacter = httpCapability
		.sendRequest(
			runtime,
			fetchStarWarsCharacter,
			consensusIdenticalAggregation(),
		)(runtime.config, characterId)
		.result()

	return result
}

const initWorkflow = () => {
	const httpTrigger = new cre.capabilities.HTTPCapability()

	return [cre.handler(httpTrigger.trigger({}), onHTTPTrigger)]
}

export async function main() {
	const runner = await Runner.newRunner<Config>({
		configSchema,
	})
	await runner.run(initWorkflow)
}

main()
