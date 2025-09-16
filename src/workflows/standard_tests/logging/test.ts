import { cre, type Runtime } from '@cre/sdk/cre'
import { BasicCapability as BasicTriggerCapability } from '@cre/generated-sdk/capabilities/internal/basictrigger/v1/basic_sdk_gen'
import { Value } from '@cre/sdk/utils'

type Config = 'config'

const doLog = (config: Config, runtime: Runtime) => {
	runtime.logger.log('log from wasm!')
	cre.sendResponseValue(Value.from(Buffer.from(config)))
}

const initWorkflow = () => {
	const basicTrigger = new BasicTriggerCapability()

	return [cre.handler(basicTrigger.trigger({}), doLog)]
}

export async function main() {
	console.log(`TS workflow: standard test: logging [${new Date().toISOString()}]`)

	const runner = await cre.newRunner<Config>()
	await runner.run(initWorkflow)
}

cre.withErrorBoundary(main)
