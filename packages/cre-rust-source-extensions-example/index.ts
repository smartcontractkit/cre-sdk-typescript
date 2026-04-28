import { rustAlpha } from '@chainlink/cre-rust-inject-alpha'
import { rustBeta } from '@chainlink/cre-rust-inject-beta'
import { CronCapability, handler, Runner, type Runtime } from '@chainlink/cre-sdk'
import { z } from 'zod'

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
