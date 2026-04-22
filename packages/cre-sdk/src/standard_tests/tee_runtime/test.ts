import type { Outputs } from '@cre/generated/capabilities/internal/basictrigger/v1/basic_trigger_pb'
import { TeeType } from '@cre/generated/sdk/v1alpha/sdk_pb'
import { BasicCapability as BasicTriggerCapability } from '@cre/generated-sdk/capabilities/internal/basictrigger/v1/basic_sdk_gen'
import { cre, type TeeRuntime } from '@cre/sdk/cre'
import { TeeRunner } from '@cre/sdk/wasm'

const callback = (_: TeeRuntime<Uint8Array>, __: Outputs) => 0

const initWorkflow = () => {
	const basicTrigger = new BasicTriggerCapability()
	return [cre.handler(basicTrigger.trigger({ name: 'first-trigger', number: 100 }), callback)]
}

export async function main() {
	console.log(`TS workflow: standard test: config [${new Date().toISOString()}]`)

	const runner = await TeeRunner.newRunner<Uint8Array>({
		tees: [{ type: TeeType.AWS_NITRO, regions: ['us-west-2'] }],
		configHandlerParams: {
			configParser: (c: Uint8Array) => c,
		},
	})
	await runner.run(initWorkflow)
}

await main()
