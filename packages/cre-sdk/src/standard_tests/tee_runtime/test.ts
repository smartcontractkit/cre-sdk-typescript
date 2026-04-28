import type { Outputs } from '@cre/generated/capabilities/internal/basictrigger/v1/basic_trigger_pb'
import { TeeType } from '@cre/generated/sdk/v1alpha/sdk_pb'
import { BasicCapability as BasicTriggerCapability } from '@cre/generated-sdk/capabilities/internal/basictrigger/v1/basic_sdk_gen'
import { cre, type Runtime, type TeeRuntime } from '@cre/sdk/cre'
import { Runner } from '@cre/sdk/wasm'
import { handlerInTee } from '@cre/sdk/workflow'

const teeTrigger = (_: TeeRuntime<Uint8Array>, __: Outputs) => 0
const regularTrigger = (_: Runtime<Uint8Array>, __: Outputs) => 0

const initWorkflow = () => {
	const basicTrigger = new BasicTriggerCapability()
	return [
		handlerInTee(basicTrigger.trigger({ name: 'first-trigger', number: 100 }), teeTrigger, [
			{ type: TeeType.AWS_NITRO, regions: ['us-west-2'] },
		]),
		cre.handler(basicTrigger.trigger({ name: 'second-trigger', number: 200 }), regularTrigger),
	]
}

export async function main() {
	console.log(`TS workflow: standard test: config [${new Date().toISOString()}]`)

	const runner = await Runner.newRunner<Uint8Array>({
		configParser: (c: Uint8Array) => c,
	})
	await runner.run(initWorkflow)
}

await main()
