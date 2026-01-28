import {
	CronCapability,
	consensusIdenticalAggregation,
	HTTPClient,
	handler,
	type NodeRuntime,
	Runner,
	type Runtime,
} from '@chainlink/cre-sdk'
import { z } from 'zod'

const configSchema = z.object({
	schedule: z.string(),
	apiUrl: z.string(),
})

type Config = z.infer<typeof configSchema>

const parallelRequests = (nodeRuntime: NodeRuntime<Config>) => {
	const httpClient = new HTTPClient()

	nodeRuntime.log('Request 1 preparation')
	const result1 = httpClient
		.sendRequest(nodeRuntime, {
			url: `${nodeRuntime.config.apiUrl}/example1`,
			method: 'GET',
		})
		.result()

	nodeRuntime.log('Request 1 result() in')

	nodeRuntime.log('Request 2 preparation')
	const result2 = httpClient
		.sendRequest(nodeRuntime, {
			url: `${nodeRuntime.config.apiUrl}/example2`,
			method: 'GET',
		})
		.result()
	nodeRuntime.log('Request 2 result() in')

	nodeRuntime.log('Both requests completed')

	if (result1.statusCode < 200 || result1.statusCode >= 300) {
		throw new Error(`HTTP request 1 failed with status: ${result1.statusCode}`)
	}

	if (result2.statusCode < 200 || result2.statusCode >= 300) {
		throw new Error(`HTTP request 2 failed with status: ${result2.statusCode}`)
	}

	const result1Text = new TextDecoder().decode(result1.body)
	const result2Text = new TextDecoder().decode(result2.body)
	return `${result1Text} ${result2Text}`
}

const onCronTrigger = (runtime: Runtime<Config>) => {
	return runtime.runInNodeMode(parallelRequests, consensusIdenticalAggregation())().result()
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
