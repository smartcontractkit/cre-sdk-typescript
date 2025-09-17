import { BasicActionCapability } from '@cre/generated-sdk/capabilities/internal/basicaction/v1/basicaction_sdk_gen'
import { BasicActionCapability as NodeActionCapability } from '@cre/generated-sdk/capabilities/internal/nodeaction/v1/basicaction_sdk_gen'
import type { NodeRuntime } from '@cre/sdk/runtime/runtime'
import { BasicCapability as BasicTriggerCapability } from '@cre/generated-sdk/capabilities/internal/basictrigger/v1/basic_sdk_gen'
import { cre, type Runtime } from '@cre/sdk/cre'
import { Int64, Value, ConsensusAggregationByFields, median } from '@cre/sdk/utils'

// Doesn't matter for this test
type Config = any

class Output {
	constructor(public OutputThing: Int64) {}
}

const handler = async (_config: Config, runtime: Runtime) => {
	const donInput = { inputThing: true }
	const basicActionCapability = new BasicActionCapability()
	const donResponse = await basicActionCapability.performAction(donInput)
	runtime.now()

	const consensusOutput = await cre.runInNodeMode(
		async (nodeRuntime: NodeRuntime): Promise<Output> => {
			nodeRuntime.now()
			const nodeActionCapability = new NodeActionCapability()
			const nodeResponse = await nodeActionCapability.performAction({ inputThing: true })

			return new Output(new Int64(nodeResponse.outputThing))
		},
		ConsensusAggregationByFields<Output>({ OutputThing: median }).withDefault(
			new Output(new Int64(123)),
		),
	)()

	runtime.now()

	cre.sendResponseValue(
		Value.from(`${donResponse.adaptedThing}${consensusOutput.OutputThing.value}`),
	)
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
