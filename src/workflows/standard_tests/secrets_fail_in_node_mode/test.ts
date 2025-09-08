import { create } from '@bufbuild/protobuf'
import { cre, type Runtime, type NodeRuntime } from '@cre/sdk/cre'
import { BasicCapability as BasicTriggerCapability } from '@cre/generated-sdk/capabilities/internal/basictrigger/v1/basic_sdk_gen'
// TODO: is this part of CRE or test utils?
import { consensusDescriptorIdentical, observationError } from '@cre/sdk/utils/values/consensus'
import { SimpleConsensusInputsSchema } from '@cre/generated/sdk/v1alpha/sdk_pb'

// Doesn't matter for this test
type Config = any

const secretAccessInNodeMode = async (_config: Config, runtime: Runtime) => {
	cre.runInNodeMode(async (_nodeRuntime: NodeRuntime) => {
		try {
			await runtime.getSecret('anything')
		} catch {
			// We expect this to fail as we're in Node Mode now, therefore ignore errors
		}

		return create(SimpleConsensusInputsSchema, {
			observation: observationError('cannot use Runtime inside RunInNodeMode'),
			descriptors: consensusDescriptorIdentical,
		})
	})

	cre.sendError(new Error('cannot use Runtime inside RunInNodeMode'))
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
