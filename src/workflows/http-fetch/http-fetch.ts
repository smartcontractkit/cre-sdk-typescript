import { z } from 'zod'
import { cre } from '@cre/sdk/cre'
import { type NodeRuntime } from '@cre/sdk/runtime/runtime'
import { withErrorBoundary } from '@cre/sdk/utils/error-boundary'

const configSchema = z.object({
	schedule: z.string(),
	apiUrl: z.string(),
})

type Config = z.infer<typeof configSchema>

const fetchMathResult = async (config: Config) => {
	const response = await cre.utils.fetch({
		url: config.apiUrl,
	})
	return Number.parseFloat(response.body.trim())
}

const fetchAggregatedResult = async (config: Config) =>
	cre.runInNodeMode(async (_nodeRuntime: NodeRuntime) => {
		const result = await fetchMathResult(config)
		return cre.utils.consensus.getAggregatedValue(cre.utils.val.float64(result), 'median')
	})

const onCronTrigger = async (config: Config) => {
	const aggregatedValue = await fetchAggregatedResult(config)
	cre.sendResponseValue(cre.utils.val.mapValue({ Result: aggregatedValue }))
}

const initWorkflow = (config: Config) => {
	const cron = new cre.capabilities.CronCapability()

	return [cre.handler(cron.trigger({ schedule: config.schedule }), onCronTrigger)]
}

export async function main() {
	const runner = await cre.newRunner<Config>({
		configSchema,
	})
	await runner.run(initWorkflow)
}

withErrorBoundary(main)
