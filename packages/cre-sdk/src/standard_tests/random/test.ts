import { BasicCapability as BasicTriggerCapability } from '@cre/generated-sdk/capabilities/internal/basictrigger/v1/basic_sdk_gen'
import { BasicActionCapability as NodeActionCapability } from '@cre/generated-sdk/capabilities/internal/nodeaction/v1/basicaction_sdk_gen'
import { cre, type NodeRuntime, type Runtime } from '@cre/sdk/cre'
import { ConsensusAggregationByFields, Int64, median } from '@cre/sdk/utils'
import { Runner } from '@cre/sdk/wasm'

class Output {
	constructor(public OutputThing: Int64) {}
}

const castRandomToUint64 = (randomFloat: number) =>
	BigInt(Math.floor(randomFloat * Number.MAX_SAFE_INTEGER))

const randHandler = (runtime: Runtime<Uint8Array>) => {
	const donRandomNumber = castRandomToUint64(Math.random())

	let total = donRandomNumber

	runtime
		.runInNodeMode(
			(nodeRuntime: NodeRuntime<Uint8Array>) => {
				const nodeRandomNumber = castRandomToUint64(Math.random())

				const nodeActionCapability = new NodeActionCapability()
				const nodeResponse = nodeActionCapability
					.performAction(nodeRuntime, {
						inputThing: true,
					})
					.result()

				if (nodeResponse.outputThing < 100n) {
					runtime.log(`***${nodeRandomNumber.toString()}`)
				}

				return new Output(new Int64(nodeResponse.outputThing))
			},
			ConsensusAggregationByFields<Output>({
				OutputThing: median,
			}).withDefault(new Output(new Int64(123n))),
		)()
		.result()

	total += donRandomNumber

	return total
}

const initWorkflow = () => {
	const basicTrigger = new BasicTriggerCapability()

	return [cre.handler(basicTrigger.trigger({}), randHandler)]
}

export async function main() {
	console.log(`TS workflow: standard test: random [${new Date().toISOString()}]`)

	const runner = await Runner.newRunner<Uint8Array>({
		configParser: (c) => c,
	})

	await runner.run(initWorkflow)
}

await main()
