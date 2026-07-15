import {
	ConfidentialHTTPClient,
	CronCapability,
	handler,
	httpRequest,
	json,
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

// Workflow demonstrate a usage of `httpRequest` helper
// to build type-safe payloads for `ConfidentialHTTPClient`.
const onCronTrigger = (runtime: Runtime<Config>) => {
	const client = new ConfidentialHTTPClient()

	// Example 1: request config as separate variable
	const separateRequestConfig = {
		request: httpRequest({
			url: runtime.config.url,
			method: 'POST',
			bodyString: '{ hello: "world" }',
			multiHeaders: {
				'content-type': { values: ['application/json'] },
			},
		}),
	}

	client.sendRequest(runtime, separateRequestConfig).result()

	// Example 2: using helper inline
	client
		.sendRequest(runtime, {
			request: httpRequest({
				url: runtime.config.url,
				method: 'POST',
				body: { hello: 'world' },
				multiHeaders: {
					'content-type': { values: ['application/json'] },
				},
			}),
		})
		.result()

	// Example 3: not using helper at all
	client
		.sendRequest(runtime, {
			request: {
				url: runtime.config.url,
				method: 'POST',
				// no helper -> must use bodyString/bodyBytes (proto oneof keys)
				bodyString: JSON.stringify({ hello: 'world' }),
				multiHeaders: {
					'content-type': { values: ['application/json'] },
				},
			},
		})
		.result()

	return { success: true }
}

const initWorkflow = (config: Config) => {
	const cron = new CronCapability()
	return [handler(cron.trigger({ schedule: config.schedule }), onCronTrigger)]
}

export async function main() {
	const runner = await Runner.newRunner<Config>({ configSchema })
	await runner.run(initWorkflow)
}
