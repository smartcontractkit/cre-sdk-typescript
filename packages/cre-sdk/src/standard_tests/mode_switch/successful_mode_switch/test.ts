import { BasicActionCapability } from '@cre/generated-sdk/capabilities/internal/basicaction/v1/basicaction_sdk_gen'
import { BasicCapability as BasicTriggerCapability } from '@cre/generated-sdk/capabilities/internal/basictrigger/v1/basic_sdk_gen'
import { BasicActionCapability as NodeActionCapability } from '@cre/generated-sdk/capabilities/internal/nodeaction/v1/basicaction_sdk_gen'
import { cre, type Runtime } from '@cre/sdk/cre'
import type { NodeRuntime } from '@cre/sdk/runtime'
import { ConsensusAggregationByFields, Int64, median } from '@cre/sdk/utils'
import { Runner } from '@cre/sdk/wasm'

class Output {
	constructor(public OutputThing: Int64) {}
}

const handler = (runtime: Runtime<Uint8Array>) => {
	const donInput = { inputThing: true }
	const basicActionCapability = new BasicActionCapability()
	const donResponse = basicActionCapability.performAction(runtime, donInput).result()
	runtime.now()

	const consensusOutput = runtime.runInNodeMode(
		(nodeRuntime: NodeRuntime<Uint8Array>): Output => {
			nodeRuntime.now()
			const nodeActionCapability = new NodeActionCapability()
			const nodeResponse = nodeActionCapability
				.performAction(nodeRuntime, {
					inputThing: true,
				})
				.result()

			return new Output(new Int64(nodeResponse.outputThing))
		},
		ConsensusAggregationByFields<Output>({ OutputThing: median }).withDefault(
			new Output(new Int64(123)),
		),
	)()

	runtime.now()

	return `${donResponse.adaptedThing}${consensusOutput.result().OutputThing.value}`
}

const initWorkflow = () => {
	const basicTrigger = new BasicTriggerCapability()

	return [cre.handler(basicTrigger.trigger({}), handler)]
}

export async function main() {
	console.log(
		`TS workflow: standard test: mode_switch: successful_mode_switch [${new Date().toISOString()}]`,
	)

	const runner = await Runner.newRunner<Uint8Array>({
		configParser: (c) => c,
	})
	runner.run(initWorkflow)
}

await main()
