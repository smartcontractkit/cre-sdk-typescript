import { BasicActionCapability } from '@cre/generated-sdk/capabilities/internal/basicaction/v1/basicaction_sdk_gen'
import { BasicCapability as BasicTriggerCapability } from '@cre/generated-sdk/capabilities/internal/basictrigger/v1/basic_sdk_gen'
import { cre } from '@cre/sdk/cre'
import { runInNodeMode } from '@cre/sdk/runtime/run-in-node-mode'
import { consensusIdenticalAggregation } from '@cre/sdk/utils'

// Doesn't matter for this test
type Config = unknown

const handler = async (_config: Config) => {
	try {
		await runInNodeMode(async () => {
			const basicCap = new BasicActionCapability()
			return (await basicCap.performAction({ inputThing: true }).result()).adaptedThing
		}, consensusIdenticalAggregation())()
	} catch (e) {
		cre.sendError(e as Error)
	}
}

const initWorkflow = () => {
	const basicTrigger = new BasicTriggerCapability()

	return [cre.handler(basicTrigger.trigger({}), handler)]
}

export async function main() {
	console.log(
		`TS workflow: standard test: mode_switch: successful_mode_switch [${new Date().toISOString()}]`,
	)

	const runner = await cre.newRunner()
	await runner.run(initWorkflow)
}

cre.withErrorBoundary(main)
