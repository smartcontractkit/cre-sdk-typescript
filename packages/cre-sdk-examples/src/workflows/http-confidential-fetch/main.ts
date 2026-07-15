import {
	ConfidentialHTTPClient,
	CronCapability,
	handler,
	ok,
	Runner,
	type Runtime,
	text,
} from '@chainlink/cre-sdk'
import { z } from 'zod'

const configSchema = z.object({
	schedule: z.string(),
	url: z.string(),
})

type Config = z.infer<typeof configSchema>

const onCronTrigger = (runtime: Runtime<Config>) => {
	runtime.log('Confidential HTTP workflow triggered.')

	const confHTTPClient = new ConfidentialHTTPClient()
	const response = confHTTPClient
		.sendRequest(runtime, {
			request: {
				url: runtime.config.url,
				method: 'GET',
			},
		})
		.result()

	if (!ok(response)) {
		throw new Error(`HTTP request failed with status: ${response.statusCode}`)
	}

	const responseText = text(response)
	const result = Number.parseFloat(responseText)

	runtime.log(`Successfully fetched result: ${result}`)

	return {
		result,
	}
}

const initWorkflow = (config: Config) => {
	const cron = new CronCapability()

	return [handler(cron.trigger({ schedule: config.schedule }), onCronTrigger)]
}

export async function main() {
	const runner = await Runner.newRunner<Config>({ configSchema })

	await runner.run(initWorkflow)
}
