import {
	CronCapability,
	consensusIdenticalAggregation,
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

const parallelRequests = (
	sendRequester: HTTPSendRequester,
	config: Config,
	log: (msg: string) => void,
) => {
	log('Request 1 preparation')
	const response1 = sendRequester.sendRequest({
		url: `${config.apiUrl}/example1`,
		method: 'GET',
	})

	log('Request 2 preparation')
	const response2 = sendRequester.sendRequest({
		url: `${config.apiUrl}/example2`,
		method: 'GET',
	})

	log('Request 2 result() called')
	const result2 = response2.result()
	log('Request 1 result() called')
	const result1 = response1.result()

	log('Both requests completed')

	if (!ok(result1)) {
		throw new Error(`HTTP request 1 failed with status: ${result1.statusCode}`)
	}

	if (!ok(result2)) {
		throw new Error(`HTTP request 2 failed with status: ${result2.statusCode}`)
	}

	const result1Text = text(result1)
	const result2Text = text(result2)
	return `${result1Text} ${result2Text}`
}

const onCronTrigger = (runtime: Runtime<Config>) => {
	const httpCapability = new HTTPClient()
	return httpCapability
		.sendRequest(
			runtime,
			parallelRequests,
			consensusIdenticalAggregation(),
		)(runtime.config, (msg) => runtime.log(msg))
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
