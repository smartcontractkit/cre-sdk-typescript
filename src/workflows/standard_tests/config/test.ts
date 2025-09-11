import { cre } from '@cre/sdk/cre'
import { BasicCapability as BasicTriggerCapability } from '@cre/generated-sdk/capabilities/internal/basictrigger/v1/basic_sdk_gen'

type Config = 'config'

const sendBackConfig = (config: Config) => {
	cre.sendResponseValue(cre.utils.val.bytes(Buffer.from(config)))
}

const initWorkflow = () => {
	const basicTrigger = new BasicTriggerCapability()

	return [cre.handler(basicTrigger.trigger({}), sendBackConfig)]
}

export async function main() {
	console.log(`TS workflow: standard test: config [${new Date().toISOString()}]`)

	const runner = await cre.newRunner<Config>()
	await runner.run(initWorkflow)
}

cre.withErrorBoundary(main)
