import {
	ConfidentialHTTPClient,
	CronCapability,
	handler,
	json,
	ok,
	Runner,
	type Runtime,
	safeJsonStringify,
} from '@chainlink/cre-sdk'
import { z } from 'zod'

const configSchema = z.object({
	schedule: z.string(),
	owner: z.string(),
	url: z.string(),
})

type Config = z.infer<typeof configSchema>

type ResponseValues = {
	result: {
		headers: {
			'secret-header': string
		}
	}
}

const onCronTrigger = (runtime: Runtime<Config>) => {
	runtime.log('Confidential HTTP workflow triggered.')

	const confHTTPClient = new ConfidentialHTTPClient()
	const response = confHTTPClient
		.sendRequest(runtime, {
			request: {
				url: runtime.config.url,
				method: 'GET',
				multiHeaders: { 'secret-header': { values: ['{{.SECRET_HEADER}}'] } },
			},
			vaultDonSecrets: [
				{
					key: 'SECRET_HEADER',
					owner: runtime.config.owner,
				},
			],
		})
		.result()

	if (!ok(response)) {
		throw new Error(`HTTP request failed with status: ${response.statusCode}`)
	}

	const result = json(response) as ResponseValues

	runtime.log(`Successfully fetched result: ${safeJsonStringify(result)}`)

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
