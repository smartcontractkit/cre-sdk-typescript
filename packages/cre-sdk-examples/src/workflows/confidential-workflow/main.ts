import {
	CronCapability,
	HTTPClient,
	handlerInTee,
	ok,
	Runner,
	type TeeRuntime,
	text,
} from '@chainlink/cre-sdk'
import { z } from 'zod'

const configSchema = z.object({
	schedule: z.string(),
	url: z.string(),
})

type Config = z.infer<typeof configSchema>

const onCronTrigger = (runtime: TeeRuntime<Config>) => {
	const client = new HTTPClient()
	const apiToken = runtime.getSecret({ id: 'API_TOKEN' }).result().value

	const response = client
		.sendRequest(runtime, {
			url: runtime.config.url,
			method: 'GET',
			headers: {
				authorization: `Bearer ${apiToken}`,
			},
		})
		.result()

	if (!ok(response)) {
		throw new Error(`HTTP request failed with status: ${response.statusCode}`)
	}

	const body = text(response)
	runtime.log(`TEE HTTP request succeeded with status ${response.statusCode}`)

	return {
		statusCode: response.statusCode,
		body,
	}
}

const initWorkflow = (config: Config) => {
	const cron = new CronCapability()

	return [
		handlerInTee(cron.trigger({ schedule: config.schedule }), onCronTrigger, [{ tee: 'nitro' }]),
	]
}

export async function main() {
	const runner = await Runner.newRunner<Config>({ configSchema })
	await runner.run(initWorkflow)
}