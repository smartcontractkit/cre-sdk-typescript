import { BasicCapability as BasicTriggerCapability } from '@cre/generated-sdk/capabilities/internal/basictrigger/v1/basic_sdk_gen'
import { cre, type NodeRuntime, type Runtime } from '@cre/sdk/cre'
import { consensusIdenticalAggregation } from '@cre/sdk/utils'
import { Runner } from '@cre/sdk/wasm'

const secretAccessInNodeMode = (runtime: Runtime<Uint8Array>) => {
	return runtime
		.runInNodeMode((_nodeRuntime: NodeRuntime<Uint8Array>) => {
			return runtime.getSecret({ id: 'anything' }).result()
		}, consensusIdenticalAggregation())()
		.result()
}

const initWorkflow = () => {
	const basicTrigger = new BasicTriggerCapability()

	return [cre.handler(basicTrigger.trigger({}), secretAccessInNodeMode)]
}

export async function main() {
	console.log(`TS workflow: standard test: secrets_fail_in_node_mode [${new Date().toISOString()}]`)

	const runner = await Runner.newRunner<Uint8Array>({
		configParser: (c) => c,
	})
	await runner.run(initWorkflow)
}

await main()
