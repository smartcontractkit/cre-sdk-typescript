import type { Outputs } from '@cre/generated/capabilities/internal/basictrigger/v1/basic_trigger_pb'
import { BasicCapability as BasicTriggerCapability } from '@cre/generated-sdk/capabilities/internal/basictrigger/v1/basic_sdk_gen'
import { cre, type Runtime } from '@cre/sdk/cre'
import { Runner } from '@cre/sdk/wasm'

const sendBackConfig = (runtime: Runtime<Uint8Array>, _: Outputs) => {
	return runtime.config
}

const initWorkflow = () => {
	const basicTrigger = new BasicTriggerCapability()
	return [cre.handler(basicTrigger.trigger({}), sendBackConfig)]
}

export async function main() {
	console.log(`TS workflow: standard test: config [${new Date().toISOString()}]`)

	const runner = await Runner.newRunner<Uint8Array>({})
	await runner.run(initWorkflow)
}

await main()
