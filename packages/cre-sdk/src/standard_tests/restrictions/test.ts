import type { Outputs } from '@cre/generated/capabilities/internal/basictrigger/v1/basic_trigger_pb'
import type { RestrictionsJson } from '@cre/generated/sdk/v1alpha/sdk_pb'
import { BasicActionCapability } from '@cre/generated-sdk/capabilities/internal/basicaction/v1/basicaction_sdk_gen'
import { BasicCapability as BasicTriggerCapability } from '@cre/generated-sdk/capabilities/internal/basictrigger/v1/basic_sdk_gen'
import type { Workflow } from '@cre/sdk'
import { cre, type Runtime } from '@cre/sdk/cre'
import { Runner } from '@cre/sdk/wasm'
import type { ByteArray } from 'viem'

const trigger = (runtime: Runtime<Uint8Array>, __: Outputs): string => {
	const basicCapability = new BasicActionCapability()
	const result = basicCapability.performAction(runtime, { inputThing: true }).result()
	return result.adaptedThing
}

const preHook = (_: ByteArray, __: Outputs): RestrictionsJson => {
	return {
		capabilities: {
			maxTotalCalls: 0,
		},
	}
}

const initWorkflow = (_: ByteArray): Workflow<Uint8Array> => {
	const basicTrigger = new BasicTriggerCapability()

	return [
		cre.handler(basicTrigger.trigger({ name: 'first-trigger', number: 100 }), trigger, {
			preHook: preHook,
		}),
	]
}

export async function main() {
	const runner = await Runner.newRunner<Uint8Array>({
		configParser: (c) => c,
	})
	await runner.run(initWorkflow)
}

await main()
