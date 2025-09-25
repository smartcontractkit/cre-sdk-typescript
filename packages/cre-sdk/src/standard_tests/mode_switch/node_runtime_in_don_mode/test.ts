import { BasicCapability as BasicTriggerCapability } from '@cre/generated-sdk/capabilities/internal/basictrigger/v1/basic_sdk_gen'
import { BasicActionCapability as NodeActionCapability } from '@cre/generated-sdk/capabilities/internal/nodeaction/v1/basicaction_sdk_gen'
import { cre, type NodeRuntime, type Runtime } from '@cre/sdk/cre'
import { consensusIdenticalAggregation } from '@cre/sdk/utils'
import { Runner } from '@cre/sdk/wasm'

const handler = async (runtime: Runtime<Uint8Array>) => {
	// First, run in node mode and do consensus - this makes the expected CallCapability call
	var nrt: NodeRuntime<Uint8Array> | undefined
	await runtime.runInNodeMode(async (nodeRuntime: NodeRuntime<Uint8Array>) => {
		nrt = nodeRuntime
		return 'hi'
	}, consensusIdenticalAggregation())()

	// Now we're back in DON mode, try to use a NODE mode capability
	// This should trigger assertNodeSafe() and throw "cannot use NodeRuntime outside RunInNodeMode"
	const nodeActionCapability = new NodeActionCapability()
	await nodeActionCapability.performAction(nrt!, { inputThing: true }).result()
	return 'hi'
}

const initWorkflow = () => {
	const basicTrigger = new BasicTriggerCapability()

	return [cre.handler(basicTrigger.trigger({}), handler)]
}

export async function main() {
	console.log(
		`TS workflow: standard test: mode_switch: node_runtime_in_don_mode [${new Date().toISOString()}]`,
	)

	const runner = await Runner.newRunner<Uint8Array>({
		configParser: (c) => c,
	})
	await runner.run(initWorkflow)
}

await main()
