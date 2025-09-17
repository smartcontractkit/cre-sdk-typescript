import { BasicCapability as BasicTriggerCapability } from '@cre/generated-sdk/capabilities/internal/basictrigger/v1/basic_sdk_gen'
import { cre, type NodeRuntime, type Runtime } from '@cre/sdk/cre'
import { consensusMedianAggregation } from '@cre/sdk/utils'

// Doesn't matter for this test
type Config = unknown

const secretAccessInNodeMode = async (_config: Config, runtime: Runtime) => {
	try {
		await cre.runInNodeMode(async (_nodeRuntime: NodeRuntime) => {
			return await runtime.getSecret('anything')
		}, consensusMedianAggregation())()
	} catch {
		cre.sendError('cannot use Runtime inside RunInNodeMode')
	}
}

const initWorkflow = () => {
	const basicTrigger = new BasicTriggerCapability()

	return [cre.handler(basicTrigger.trigger({}), secretAccessInNodeMode)]
}

export async function main() {
	console.log(`TS workflow: standard test: secrets_fail_in_node_mode [${new Date().toISOString()}]`)

	const runner = await cre.newRunner<Config>()
	await runner.run(initWorkflow)
}

cre.withErrorBoundary(main)
