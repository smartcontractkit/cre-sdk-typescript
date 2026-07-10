import { BasicCapability as BasicTriggerCapability } from '@cre/generated-sdk/capabilities/internal/basictrigger/v1/basic_sdk_gen'
import { BasicActionCapability as NodeActionCapability } from '@cre/generated-sdk/capabilities/internal/nodeaction/v1/basicaction_sdk_gen'
import { cre, type Runtime } from '@cre/sdk/cre'
import type { NodeRuntime } from '@cre/sdk/runtime'
import {
	ConsensusAggregationByFields,
	type FrequencyListEntry,
	frequencyList,
	identical,
} from '@cre/sdk/utils'
import { Runner } from '@cre/sdk/wasm'

class NodeObservation {
	constructor(
		public payload: Uint8Array,
		public signatures: Uint8Array,
	) {}
}

type ConsensusResult = {
	payload: Uint8Array
	signatures: FrequencyListEntry<Uint8Array>[]
}

const bytesToHex = (bytes: Uint8Array): string =>
	Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('')

const formatFrequencyList = (entries: FrequencyListEntry<Uint8Array>[]): string =>
	entries.map((entry) => `${bytesToHex(entry.value)}x${entry.count.value}`).join(',')

const formatResult = (result: ConsensusResult): string =>
	`${bytesToHex(result.payload)}|${formatFrequencyList(result.signatures)}`

const handler = (runtime: Runtime<Uint8Array>) => {
	const encoder = new TextEncoder()
	const result = runtime
		.runInNodeMode(
			(nodeRuntime: NodeRuntime<Uint8Array>): NodeObservation => {
				const nodeResponse = new NodeActionCapability()
					.performAction(nodeRuntime, { inputThing: true })
					.result()

				return new NodeObservation(
					encoder.encode(`payload-${nodeResponse.outputThing}`),
					encoder.encode(`sig-${nodeResponse.outputThing}`),
				)
			},
			ConsensusAggregationByFields<NodeObservation>({
				payload: identical,
				signatures: frequencyList,
			}),
		)()
		.result() as unknown as ConsensusResult

	return formatResult(result)
}

const initWorkflow = () => {
	const basicTrigger = new BasicTriggerCapability()

	return [cre.handler(basicTrigger.trigger({}), handler)]
}

export async function main() {
	console.log(`TS workflow: standard test: frequency_list [${new Date().toISOString()}]`)

	const runner = await Runner.newRunner<Uint8Array>({
		configParser: (c) => c,
	})
	await runner.run(initWorkflow)
}

await main()
