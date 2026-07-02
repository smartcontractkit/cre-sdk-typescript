import {
	CronCapability,
	consensusMedianAggregation,
	HTTPClient,
	type HTTPSendRequester,
	handler,
	ok,
	Runner,
	type Runtime,
	text,
} from '@chainlink/cre-sdk'
import { z } from 'zod'

const configSchema = z.object({
	schedule: z.string(),
	apiUrl: z.string(),
})

type Config = z.infer<typeof configSchema>

const fetchMathResult = (sendRequester: HTTPSendRequester, config: Config) => {
	const response = sendRequester.sendRequest({ url: config.apiUrl, method: 'GET' }).result()

	// Check if the response is successful using the helper function
	if (!ok(response)) {
		throw new Error(`HTTP request failed with status: ${response.statusCode}`)
	}

	// Convert response body to text using the helper function
	const responseText = text(response)
	return Number.parseFloat(responseText)
}

const onCronTrigger = (runtime: Runtime<Config>) => {
	const httpCapability = new HTTPClient()
	return httpCapability
		.sendRequest(
			runtime,
			fetchMathResult,
			consensusMedianAggregation(),
		)(runtime.config)
		.result()
}

const initWorkflow = (config: Config) => {
	const cron = new CronCapability()
	return [handler(cron.trigger({ schedule: config.schedule }), onCronTrigger)]
}

export async function main() {
	const runner = await Runner.newRunner<Config>({
		configSchema,
	})
	await runner.run(initWorkflow)
}
