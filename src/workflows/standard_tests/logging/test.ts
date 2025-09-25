import type { Outputs } from '@cre/generated/capabilities/internal/basictrigger/v1/basic_trigger_pb'
import { BasicCapability as BasicTriggerCapability } from '@cre/generated-sdk/capabilities/internal/basictrigger/v1/basic_sdk_gen'
import { cre, type Runtime } from '@cre/sdk/cre'
import { Runner } from '@cre/sdk/wasm'
import { hostBindings } from '@cre/sdk/wasm/host-bindings'

const doLog = (runtime: Runtime<string>, _: Outputs) => {
	hostBindings.log('log from wasm!')
	return runtime.config
}

const initWorkflow = () => {
	const basicTrigger = new BasicTriggerCapability()

	return [cre.handler(basicTrigger.trigger({}), doLog)]
}

export async function main() {
	console.log(`TS workflow: standard test: logging [${new Date().toISOString()}]`)

	const runner = await Runner.newRunner<string>({
		configParser: (config) => config.toString(),
	})
	await runner.run(initWorkflow)
}

await main()
