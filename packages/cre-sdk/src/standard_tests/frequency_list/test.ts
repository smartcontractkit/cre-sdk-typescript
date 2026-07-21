import { BasicCapability as BasicTriggerCapability } from '@cre/generated-sdk/capabilities/internal/basictrigger/v1/basic_sdk_gen'
import { BasicActionCapability as NodeActionCapability } from '@cre/generated-sdk/capabilities/internal/nodeaction/v1/basicaction_sdk_gen'
import { cre, type Runtime } from '@cre/sdk/cre'
import type { NodeRuntime } from '@cre/sdk/runtime'
import {
	ConsensusAggregationByFields,
	consensusFrequencyListAggregation,
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

	// Field-level frequency_list: each node observes a struct; the
	// `signatures` field is aggregated as a frequency list across nodes.
	const byField = runtime
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
			ConsensusAggregationByFields<NodeObservation, ConsensusResult>({
				payload: identical,
				signatures: frequencyList,
			}),
		)()
		.result()

	// Top-level frequency_list: each node observes a single value T;
	// consensus counts occurrences across nodes to produce
	// FrequencyListEntry<T>[].
	const topLevel = runtime
		.runInNodeMode((nodeRuntime: NodeRuntime<Uint8Array>): Uint8Array => {
			const nodeResponse = new NodeActionCapability()
				.performAction(nodeRuntime, { inputThing: true })
				.result()

			return encoder.encode(`sig-${nodeResponse.outputThing}`)
		}, consensusFrequencyListAggregation<Uint8Array>())()
		.result()

	return `${formatResult(byField)}|${formatFrequencyList(topLevel)}`
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
