import { CronCapability, handler, Runner, type Runtime } from '@chainlink/cre-sdk'
import { z } from 'zod'
import { rustAlpha } from '../lib_alpha'
import { rustBeta } from '../lib_beta'

const configSchema = z.object({
	schedule: z.string(),
})

type Config = z.infer<typeof configSchema>

const onCronTrigger = (_runtime: Runtime<Config>) => {
	const alpha = rustAlpha().greet()
	const beta = rustBeta().greet()
	return JSON.stringify({ alpha, beta })
}

const initWorkflow = (config: Config) => {
	const cron = new CronCapability()
	return [handler(cron.trigger({ schedule: config.schedule }), onCronTrigger)]
}

export async function main() {
	const runner = await Runner.newRunner<Config>({ configSchema })
	await runner.run(initWorkflow)
}
