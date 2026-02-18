import { BasicActionCapability } from '@cre/generated-sdk/capabilities/internal/basicaction/v1/basicaction_sdk_gen'
import { BasicCapability as BasicTriggerCapability } from '@cre/generated-sdk/capabilities/internal/basictrigger/v1/basic_sdk_gen'
import { cre, type Runtime } from '@cre/sdk/cre'
import { consensusIdenticalAggregation } from '@cre/sdk/utils'
import { Runner } from '@cre/sdk/wasm'

const handler = (runtime: Runtime<Uint8Array>) => {
	return runtime
		.runInNodeMode(() => {
			const basicCap = new BasicActionCapability()
			return basicCap.performAction(runtime, { inputThing: true }).result().adaptedThing
		}, consensusIdenticalAggregation())()
		.result()
}

const initWorkflow = () => {
	const basicTrigger = new BasicTriggerCapability()

	return [cre.handler(basicTrigger.trigger({}), handler)]
}

export async function main() {
	console.log(
		`TS workflow: standard test: mode_switch: don_runtime_in_node_mode [${new Date().toISOString()}]`,
	)

	const runner = await Runner.newRunner<Uint8Array>({
		configParser: (c) => c,
	})
	await runner.run(initWorkflow)
}

await main()
