import type { Outputs } from '@cre/generated/capabilities/internal/basictrigger/v1/basic_trigger_pb'
import { BasicCapability as BasicTriggerCapability } from '@cre/generated-sdk/capabilities/internal/basictrigger/v1/basic_sdk_gen'
import { BasicActionCapability as NodeActionCapability } from '@cre/generated-sdk/capabilities/internal/nodeaction/v1/basicaction_sdk_gen'
import { cre, type NodeRuntime, type Runtime } from '@cre/sdk/cre'
import { ConsensusAggregationByFields, Int64, median, Value } from '@cre/sdk/utils'
import { Runner } from '@cre/sdk/wasm'
import { z } from 'zod'

const configSchema = z.object({ config: z.string() })
type Config = z.infer<typeof configSchema>

class Output {
	constructor(public OutputThing: Int64) {}
}

const randHandler = async (runtime: Runtime<Uint8Array>, _: Outputs) => {
	const donRandomNumber = Math.random()
	let total = donRandomNumber

	await runtime.runInNodeMode(
		async (nodeRuntime: NodeRuntime<Uint8Array>) => {
			const nodeRandomNumber = Math.random()

			const nodeActionCapability = new NodeActionCapability()
			const nodeResponse = await nodeActionCapability.performAction(nodeRuntime, {
				inputThing: true,
			})

			if (nodeResponse.outputThing < 100) {
				console.log(`***${nodeRandomNumber.toString()}`)
			}

			return new Output(new Int64(nodeResponse.outputThing))
		},
		ConsensusAggregationByFields<Output>({
			OutputThing: median,
		}).withDefault(new Output(new Int64(123))),
	)()

	total += donRandomNumber

	return total
}

const initWorkflow = () => {
	const basicTrigger = new BasicTriggerCapability()

	return [cre.handler(basicTrigger.trigger({}), randHandler)]
}

export async function main() {
	console.log(`TS workflow: standard test: random [${new Date().toISOString()}]`)

	const runner = await Runner.newRunner<Uint8Array>({})

	await runner.run(initWorkflow)
}

await main()
