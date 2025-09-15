import { Mode } from '@cre/generated/sdk/v1alpha/sdk_pb'
import { SimpleConsensusInputsSchema } from '@cre/generated/sdk/v1alpha/sdk_pb'
import { CapabilityError } from '@cre/sdk/utils/capabilities/capability-error'
import { create, toJson } from '@bufbuild/protobuf'
import { ConsensusCapability } from '@cre/generated-sdk/capabilities/internal/consensus/v1alpha/consensus_sdk_gen'
import { consensusDescriptorIdentical, observationError } from '@cre/sdk/utils/values/consensus'
import { cre } from '@cre/sdk/cre'
import { BasicCapability as BasicTriggerCapability } from '@cre/generated-sdk/capabilities/internal/basictrigger/v1/basic_sdk_gen'
import { type Runtime } from '@cre/sdk/runtime/runtime'

// Doesn't matter for this test
type Config = any

const handler = async (_config: Config, runtime: Runtime) => {
	const nodeRuntime = runtime.switchModes(Mode.NODE)

	const consensusInput = create(SimpleConsensusInputsSchema, {
		observation: observationError('cannot use Runtime inside RunInNodeMode'),
		descriptors: consensusDescriptorIdentical,
	})

	try {
		// Note: ConsensusCapability won't work in NODE mode.
		// We're forcing it here just for test purposes.
		// Normally, if we don't force the wrong mode, the runtime guards would prevent call to `callCapability` in the first place.
		// Because test expectation is to callCapability and verify error output, we need to "trick" the guards.
		const consensusCapability = new ConsensusCapability(Mode.NODE)
		await consensusCapability.simple(toJson(SimpleConsensusInputsSchema, consensusInput))
	} catch (e) {
		if (e instanceof CapabilityError) {
			cre.sendError('cannot use Runtime inside RunInNodeMode')
		} else {
			throw e
		}
	}

	nodeRuntime.switchModes(Mode.DON)
}

const initWorkflow = () => {
	const basicTrigger = new BasicTriggerCapability()

	return [cre.handler(basicTrigger.trigger({}), handler)]
}

export async function main() {
	console.log(
		`TS workflow: standard test: mode_switch: successful_mode_switch [${new Date().toISOString()}]`,
	)

	const runner = await cre.newRunner()
	await runner.run(initWorkflow)
}

cre.withErrorBoundary(main)
