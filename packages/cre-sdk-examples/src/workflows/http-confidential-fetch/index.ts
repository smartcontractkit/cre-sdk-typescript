import {
	type ConfidentialHTTPSendRequester,
	consensusMedianAggregation,
	cre,
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

const fetchMathResult = (sendRequester: ConfidentialHTTPSendRequester, config: Config) => {
	const { responses } = sendRequester
		.sendRequests({
			input: {
				requests: [
					{
						url: config.url,
						method: 'GET',
					},
				],
			},
		})
		.result()
	const response = responses[0]

	if (!ok(response)) {
		throw new Error(`HTTP request failed with status: ${response.statusCode}`)
	}

	// Convert response body to text using the helper function
	const responseText = text(response)

	return Number.parseFloat(responseText)
}

const onCronTrigger = (runtime: Runtime<Config>) => {
	runtime.log('Confidential HTTP workflow triggered.')

	const confHTTPClient = new cre.capabilities.ConfidentialHTTPClient()
	const result = confHTTPClient
		.sendRequests(
			runtime,
			fetchMathResult,
			consensusMedianAggregation(),
		)(runtime.config)
		.result()

	runtime.log(`Successfully fetched result: ${result}`)

	return {
		result,
	}
}

const initWorkflow = (config: Config) => {
	const cron = new cre.capabilities.CronCapability()

	return [cre.handler(cron.trigger({ schedule: config.schedule }), onCronTrigger)]
}

export async function main() {
	const runner = await Runner.newRunner<Config>({ configSchema })

	await runner.run(initWorkflow)
}

main()
