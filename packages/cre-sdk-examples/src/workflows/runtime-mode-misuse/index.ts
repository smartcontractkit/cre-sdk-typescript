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

type HttpResponse = {
	statusCode: number
	body: Uint8Array
}

const onCronTrigger = (runtime: Runtime<Config>) => {
	const httpClient = new HTTPClient()
	let deferredResult: { result: () => HttpResponse } | null = null

	const nodeResult = runtime
		.runInNodeMode((nodeRuntime: NodeRuntime<Config>) => {
			nodeRuntime.log('Node mode: issue request and stash result()')
			deferredResult = httpClient.sendRequest(nodeRuntime, {
				url: `${nodeRuntime.config.apiUrl}/example1`,
				method: 'GET',
			})

			// Intentionally wrong: use DON runtime while in node mode.
			let sawDonModeError = false
			try {
				runtime.log('Node mode: calling DON runtime capability (bad)')
				const badCall = httpClient.sendRequest(runtime as unknown as NodeRuntime<Config>, {
					url: `${nodeRuntime.config.apiUrl}/example2`,
					method: 'GET',
				})
				badCall.result()
			} catch (err) {
				sawDonModeError = true
				nodeRuntime.log(`Expected error: ${String(err)}`)
			}
			if (!sawDonModeError) {
				throw new Error('Expected DON runtime misuse to throw')
			}

			return 'node-mode done'
		}, consensusIdenticalAggregation())()
		.result()

	runtime.log(`Node mode returned: ${nodeResult}`)

	// Intentionally wrong: await node-mode result after returning to DON mode.
	if (deferredResult) {
		let sawNodeModeError = false
		try {
			runtime.log('DON mode: calling deferred node result()')
			const response = deferredResult.result()
			const body = new TextDecoder().decode(response.body)
			runtime.log(`Deferred response: ${response.statusCode} ${body.trim()}`)
		} catch (err) {
			sawNodeModeError = true
			runtime.log(`Deferred result error: ${String(err)}`)
		}
		if (!sawNodeModeError) {
			throw new Error('Expected deferred node result to throw')
		}
	}

	return 'done'
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
