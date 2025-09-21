import { cre, type Runtime, Value, withErrorBoundary } from '@chainlink/cre-sdk'

type Config = {
	schedule: string
}

const onCronTrigger = (_: Config, runtime: Runtime): void => {
	runtime.logger.log('Hello, Calculator! Workflow triggered.')
	cre.sendResponseValue(Value.from('Hello, Calculator!'))
}

const initWorkflow = (config: Config) => {
	const cron = new cre.capabilities.CronCapability()

	return [cre.handler(cron.trigger({ schedule: config.schedule }), onCronTrigger)]
}

export async function main() {
	const runner = await cre.newRunner<Config>()
	await runner.run(initWorkflow)
}

withErrorBoundary(main)
