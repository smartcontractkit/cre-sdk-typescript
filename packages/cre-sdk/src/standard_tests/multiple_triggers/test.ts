import type { TriggerEvent } from '@cre/generated/capabilities/internal/actionandtrigger/v1/action_and_trigger_pb'
import type { Outputs } from '@cre/generated/capabilities/internal/basictrigger/v1/basic_trigger_pb'
import { BasicCapability as ActionAndTriggerCapability } from '@cre/generated-sdk/capabilities/internal/actionandtrigger/v1/basic_sdk_gen'
import { BasicCapability as BasicTriggerCapability } from '@cre/generated-sdk/capabilities/internal/basictrigger/v1/basic_sdk_gen'
import { cre, type Runtime } from '@cre/sdk/cre'
import { Runner } from '@cre/sdk/wasm'

const doLog0 = (_: Runtime<Uint8Array>, output: Outputs) => {
	return `called 0 with ${output.coolOutput}`
}

const doLog1 = (_runtime: Runtime<Uint8Array>, output: TriggerEvent) => {
	return `called 1 with ${output.coolOutput}`
}

const doLog2 = (_runtime: Runtime<Uint8Array>, output: Outputs) => {
	return `called 2 with ${output.coolOutput}`
}

const initWorkflow = () => {
	const basicTrigger = new BasicTriggerCapability()
	const actionTrigger = new ActionAndTriggerCapability()

	return [
		cre.handler(basicTrigger.trigger({ name: 'first-trigger', number: 100 }), doLog0),
		cre.handler(actionTrigger.trigger({ name: 'second-trigger', number: 150 }), doLog1),
		cre.handler(basicTrigger.trigger({ name: 'third-trigger', number: 200 }), doLog2),
	]
}

export async function main() {
	console.log(`TS workflow: standard test: multiple_triggers [${new Date().toISOString()}]`)

	const runner = await Runner.newRunner<Uint8Array>({
		configParser: (c) => c,
	})
	await runner.run(initWorkflow)
}

await main()
