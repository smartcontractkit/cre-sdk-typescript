import { z } from 'zod'
import { cre } from '@cre/sdk/cre'
import { withErrorBoundary } from '@cre/sdk/utils/error-boundary'
import { Value, consensusMedianAggregation } from '@cre/sdk/utils'
import type { NodeRuntime } from '@cre/sdk/runtime/runtime'
import { runInNodeMode } from '@cre/sdk/runtime/run-in-node-mode'

const configSchema = z.object({
	schedule: z.string(),
	apiUrl: z.string(),
})

type Config = z.infer<typeof configSchema>

const fetchMathResult = async (_: NodeRuntime, config: Config) => {
	try {
		const response = await cre.utils.fetch({
			url: config.apiUrl,
		})
		return Number.parseFloat(response.body.trim())
	} catch (error) {
		console.log('fetch error', error)
		return 0
	}
}

const onCronTrigger = async (config: Config) => {
	const aggregatedValue = await runInNodeMode(fetchMathResult, consensusMedianAggregation())(config)
	cre.sendResponseValue(Value.from(aggregatedValue))
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
