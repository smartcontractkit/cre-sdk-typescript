import {
	consensusMedianAggregation,
	cre,
	type HTTPSendRequester,
	Runner,
	type Runtime,
} from '@chainlink/cre-sdk'
import { z } from 'zod'

const configSchema = z.object({
	schedule: z.string(),
	apiUrl: z.string(),
})

type Config = z.infer<typeof configSchema>

const fetchMathResult = async (sendRequester: HTTPSendRequester, config: Config) => {
	try {
		const response = await sendRequester
			.sendRequest({
				url: config.apiUrl,
			})
			.result()
		return Number.parseFloat(Buffer.from(response.body).toString('utf-8').trim())
	} catch (error) {
		console.log('fetch error', error)
		return 0
	}
}

const onCronTrigger = async (runtime: Runtime<Config>) => {
	const httpCapability = new cre.capabilities.HTTPClient()
	return await httpCapability.sendRequest(
		runtime,
		fetchMathResult,
		consensusMedianAggregation(),
	)(runtime.config)
}

const initWorkflow = (config: Config) => {
	const cron = new cre.capabilities.CronCapability()
	return [cre.handler(cron.trigger({ schedule: config.schedule }), onCronTrigger)]
}

export async function main() {
	const runner = await Runner.newRunner<Config>({
		configSchema,
	})
	await runner.run(initWorkflow)
}

main()
