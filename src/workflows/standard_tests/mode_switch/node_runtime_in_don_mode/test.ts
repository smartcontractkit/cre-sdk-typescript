import { SimpleConsensusInputsSchema } from '@cre/generated/sdk/v1alpha/sdk_pb'
import { create } from '@bufbuild/protobuf'
import { consensusDescriptorIdentical, observationValue } from '@cre/sdk/utils/values/consensus'
import { BasicCapability as BasicTriggerCapability } from '@cre/generated-sdk/capabilities/internal/basictrigger/v1/basic_sdk_gen'
import { BasicActionCapability as NodeActionCapability } from '@cre/generated-sdk/capabilities/internal/nodeaction/v1/basicaction_sdk_gen'
import { cre, type NodeRuntime } from '@cre/sdk/cre'
import { NodeModeError } from '@cre/sdk/runtime/errors'
import { Value } from '@cre/sdk/utils/values/value'

const handler = async () => {
	// First, run in node mode and do consensus - this makes the expected CallCapability call
	await cre.runInNodeMode(async (nodeRuntime: NodeRuntime) => {
		const consensusInput = create(SimpleConsensusInputsSchema, {
			observation: observationValue(new Value('hi')),
			descriptors: consensusDescriptorIdentical,
		})

		return consensusInput
	})

	try {
		// Now we're back in DON mode, try to use a NODE mode capability
		// This should trigger assertNodeSafe() and throw "cannot use NodeRuntime outside RunInNodeMode"
		const nodeActionCapability = new NodeActionCapability()
		await nodeActionCapability.performAction({ inputThing: true })
	} catch (e) {
		console.log('error', e)
		if (e instanceof NodeModeError) {
			// The runtime guards should catch this and throw the expected error
			cre.sendError('cannot use NodeRuntime outside RunInNodeMode')
		} else {
			// Should still fail the test if something else got broken
			throw e
		}
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
