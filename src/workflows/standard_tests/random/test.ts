import { z } from 'zod'
import { cre, type Runtime, type NodeRuntime } from '@cre/sdk/cre'
import { BasicCapability as BasicTriggerCapability } from '@cre/generated-sdk/capabilities/internal/basictrigger/v1/basic_sdk_gen'
import { BasicActionCapability as NodeActionCapability } from '@cre/generated-sdk/capabilities/internal/nodeaction/v1/basicaction_sdk_gen'
import { Int64, Value, ConsensusAggregationByFields, median } from '@cre/sdk/utils'

const configSchema = z.object({ config: z.string() })
type Config = z.infer<typeof configSchema>

class Output {
	constructor(public OutputThing: Int64) {}
}

const randHandler = async (_config: Config, runtime: Runtime) => {
	const donRandomNumber = runtime.getRand().Uint64()
	let total = donRandomNumber

	await cre.runInNodeMode(
		async (nodeRuntime: NodeRuntime) => {
			const nodeRandomNumber = nodeRuntime.getRand().Uint64()

			const nodeActionCapability = new NodeActionCapability()
			const nodeResponse = await nodeActionCapability
				.performAction({
					inputThing: true,
				})
				.result()

			if (nodeResponse.outputThing < 100) {
				log(`***${nodeRandomNumber.toString()}`)
			}

			return new Output(new Int64(nodeResponse.outputThing))
		},
		ConsensusAggregationByFields<Output>({
			OutputThing: median,
		}).withDefault(new Output(new Int64(123))),
	)()

	total += donRandomNumber

	cre.sendResponseValue(Value.from(total))
}

const initWorkflow = () => {
	const basicTrigger = new BasicTriggerCapability()

	return [cre.handler(basicTrigger.trigger({}), randHandler)]
}

export async function main() {
	console.log(`TS workflow: standard test: random [${new Date().toISOString()}]`)

	const runner = await cre.newRunner<Config>({
		configParser: (config) => ({ config }),
		configSchema,
	})

	await runner.run(initWorkflow)
}

cre.withErrorBoundary(main)
