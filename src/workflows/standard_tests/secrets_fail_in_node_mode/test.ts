import type { Outputs } from '@cre/generated/capabilities/internal/basictrigger/v1/basic_trigger_pb'
import { BasicCapability as BasicTriggerCapability } from '@cre/generated-sdk/capabilities/internal/basictrigger/v1/basic_sdk_gen'
import { cre, type NodeRuntime, type Runtime } from '@cre/sdk/cre'
import { consensusIdenticalAggregation } from '@cre/sdk/utils'
import { Runner } from '@cre/sdk/wasm'

// Doesn't matter for this test
type Config = unknown

const secretAccessInNodeMode = async (runtime: Runtime<Uint8Array>, _: Outputs) => {
	return await runtime.runInNodeMode(async (_nodeRuntime: NodeRuntime<Uint8Array>) => {
		return await runtime.getSecret({ id: 'anything' })
	}, consensusIdenticalAggregation())()
}

const initWorkflow = () => {
	const basicTrigger = new BasicTriggerCapability()

	return [cre.handler(basicTrigger.trigger({}), secretAccessInNodeMode)]
}

export async function main() {
	console.log(`TS workflow: standard test: secrets_fail_in_node_mode [${new Date().toISOString()}]`)

	const runner = await Runner.newRunner<Uint8Array>({})
	await runner.run(initWorkflow)
}

await main()
