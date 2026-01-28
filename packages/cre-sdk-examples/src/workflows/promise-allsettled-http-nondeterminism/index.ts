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

type RequestSpec = {
	name: string
	path: string
}

const shuffleInPlace = <T>(items: T[]) => {
	for (let i = items.length - 1; i > 0; i -= 1) {
		const j = Math.floor(Math.random() * (i + 1))
		;[items[i], items[j]] = [items[j], items[i]]
	}
	return items
}

const fetchEndpoint = (nodeRuntime: NodeRuntime<Config>, request: RequestSpec) => {
	const httpClient = new HTTPClient()
	nodeRuntime.log(`Node request: ${request.name}`)

	const response = httpClient
		.sendRequest(nodeRuntime, {
			url: `${nodeRuntime.config.apiUrl}${request.path}`,
			method: 'GET',
		})
		.result()

	if (response.statusCode < 200 || response.statusCode >= 300) {
		throw new Error(`HTTP request ${request.name} failed with status: ${response.statusCode}`)
	}

	const body = new TextDecoder().decode(response.body)
	return `${request.name}:${body.trim()}`
}

const onCronTrigger = async (runtime: Runtime<Config>) => {
	// Intentionally non-deterministic: request order differs across nodes.
	const requests = shuffleInPlace<RequestSpec>([
		{ name: 'one', path: '/example1' },
		{ name: 'two', path: '/example2' },
	])

	runtime.log(`Request order: ${requests.map((r) => r.name).join(', ')}`)

	const runFetch = runtime.runInNodeMode(fetchEndpoint, consensusIdenticalAggregation())

	const calls = requests.map((request) => ({
		request,
		call: runFetch(request),
	}))

	const settled = await Promise.allSettled(
		calls.map(({ request, call }) =>
			Promise.resolve().then(() => {
				runtime.log(`result() for ${request.name}`)
				return call.result()
			}),
		),
	)

	const results = settled.map((entry, index) => {
		if (entry.status === 'fulfilled') {
			return entry.value
		}
		return `${requests[index].name}:error:${String(entry.reason)}`
	})

	runtime.log(`Settled results: ${results.join(' | ')}`)
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
