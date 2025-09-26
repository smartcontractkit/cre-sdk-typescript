import { BasicCapability as BasicTriggerCapability } from '@cre/generated-sdk/capabilities/internal/basictrigger/v1/basic_sdk_gen'
import { cre, type Runtime } from '@cre/sdk/cre'
import { Runner } from '@cre/sdk/wasm'

const simulateWorkflowFailure = (_: Runtime<Uint8Array>) => {
	throw new Error('workflow execution failure')
}

const initWorkflow = () => {
	const basicTrigger = new BasicTriggerCapability()

	return [cre.handler(basicTrigger.trigger({}), simulateWorkflowFailure)]
}

export async function main() {
	console.log(`TS workflow: standard test: errors [${new Date().toISOString()}]`)

	const runner = await Runner.newRunner<Uint8Array>({
		configParser: (c) => c,
	})
	await runner.run(initWorkflow)
}

await main()
