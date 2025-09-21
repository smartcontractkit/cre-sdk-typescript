import { BasicCapability as BasicTriggerCapability } from '@cre/generated-sdk/capabilities/internal/basictrigger/v1/basic_sdk_gen'
import { cre } from '@cre/sdk/cre'

const simulateWorkflowFailure = () => {
	cre.sendError(new Error('workflow execution failure'))
}

const initWorkflow = () => {
	const basicTrigger = new BasicTriggerCapability()

	return [cre.handler(basicTrigger.trigger({}), simulateWorkflowFailure)]
}

export async function main() {
	console.log(`TS workflow: standard test: errors [${new Date().toISOString()}]`)

	const runner = await cre.newRunner()
	await runner.run(initWorkflow)
}

cre.withErrorBoundary(main)
