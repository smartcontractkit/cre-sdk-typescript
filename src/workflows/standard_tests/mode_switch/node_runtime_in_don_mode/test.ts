import { Mode } from '@cre/generated/sdk/v1alpha/sdk_pb'
import { SimpleConsensusInputsSchema } from '@cre/generated/sdk/v1alpha/sdk_pb'
import { create, toJson } from '@bufbuild/protobuf'
import { ConsensusCapability } from '@cre/generated-sdk/capabilities/internal/consensus/v1alpha/consensus_sdk_gen'
import { consensusDescriptorIdentical, observationValue } from '@cre/sdk/utils/values/consensus'
import { BasicCapability as BasicTriggerCapability } from '@cre/generated-sdk/capabilities/internal/basictrigger/v1/basic_sdk_gen'
import { cre, type Runtime } from '@cre/sdk/cre'

// Doesn't matter for this test
type Config = any

const handler = async (_config: Config, runtime: Runtime) => {
	let nodeRuntime = runtime.switchModes(Mode.NODE)

	try {
		const consensusInput = create(SimpleConsensusInputsSchema, {
			observation: observationValue(cre.utils.val.string('hi')),
			descriptors: consensusDescriptorIdentical,
		})

		const consensusCapability = new ConsensusCapability()
		await consensusCapability.simple(toJson(SimpleConsensusInputsSchema, consensusInput))
		nodeRuntime.switchModes(Mode.DON)
	} catch {
		console.log('cannot use NodeRuntime outside RunInNodeMode')
		cre.sendError('cannot use NodeRuntime outside RunInNodeMode')
	}
}

const initWorkflow = () => {
	const basicTrigger = new BasicTriggerCapability()

	return [cre.handler(basicTrigger.trigger({}), handler)]
}

export async function main() {
	console.log(
		`TS workflow: standard test: mode_switch: node_runtime_in_don_mode [${new Date().toISOString()}]`,
	)

	const runner = await cre.newRunner()
	await runner.run(initWorkflow)
}

cre.withErrorBoundary(main)
