import { create } from '@bufbuild/protobuf'
import { z } from 'zod'
import { cre, type Runtime, type NodeRuntime } from '@cre/sdk/cre'
import { BasicCapability as BasicTriggerCapability } from '@cre/generated-sdk/capabilities/internal/basictrigger/v1/basic_sdk_gen'
import { AggregationType, Mode } from '@cre/generated/sdk/v1alpha/sdk_pb'
import { SimpleConsensusInputsSchema } from '@cre/generated/sdk/v1alpha/sdk_pb'
import { BasicActionCapability as NodeActionCapability } from '@cre/generated-sdk/capabilities/internal/nodeaction/v1/basicaction_sdk_gen'
// TODO: does this belong in CRE?
import { consensusFieldsFrom, observationValue } from '@cre/sdk/utils/values/consensus'

const configSchema = z.object({ config: z.string() })
type Config = z.infer<typeof configSchema>

const randHandler = async (_config: Config, runtime: Runtime) => {
	const donRandomNumber = runtime.getRand().Uint64()
	let total = donRandomNumber

	await cre.runInNodeMode(async (nodeRuntime: NodeRuntime) => {
		const nodeRandomNumber = nodeRuntime.getRand().Uint64()

		const nodeActionCapability = new NodeActionCapability()
		const nodeResponse = await nodeActionCapability.performAction({
			inputThing: true,
		})

		if (nodeResponse.outputThing < 100) {
			log('***' + nodeRandomNumber.toString())
		}

		const consensusInput = create(SimpleConsensusInputsSchema, {
			observation: observationValue(
				cre.utils.val.mapValue({
					OutputThing: cre.utils.val.int64(nodeResponse.outputThing),
				}),
			),
			descriptors: consensusFieldsFrom({
				OutputThing: AggregationType.MEDIAN,
			}),
			default: cre.utils.val.mapValue({
				OutputThing: cre.utils.val.int64(123),
			}),
		})

		return consensusInput
	})

	total += donRandomNumber

	cre.sendResponseValue(cre.utils.val.bigint(total))
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
