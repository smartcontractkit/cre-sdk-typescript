import { prepareRuntime } from '@cre/sdk/utils/prepare-runtime'
import { errorBoundary } from '@cre/sdk/utils/error-boundary'
import { Mode } from '@cre/generated/sdk/v1alpha/sdk_pb'
import { SimpleConsensusInputsSchema } from '@cre/generated/sdk/v1alpha/sdk_pb'
import { sendErrorWrapped } from '@cre/sdk/testhelpers/send-error-wrapped'
import { create, toJson } from '@bufbuild/protobuf'
import { ConsensusCapability } from '@cre/generated-sdk/capabilities/internal/consensus/v1alpha/consensus_sdk_gen'
import { consensusDescriptorIdentical, observationValue } from '@cre/sdk/utils/values/consensus'
import { val } from '@cre/sdk/utils/values/value'
import { cre } from '@cre/sdk/cre'
import { handleExecuteRequest } from '@cre/sdk/engine/execute'
import { getRequest } from '@cre/sdk/utils/get-request'
import { BasicCapability as BasicTriggerCapability } from '@cre/generated-sdk/capabilities/internal/basictrigger/v1/basic_sdk_gen'
import { emptyConfig, basicRuntime } from '@cre/sdk/testhelpers/mocks'

export async function main() {
	console.log(
		`TS workflow: standard test: mode_switch: node_runtime_in_don_mode [${new Date().toISOString()}]`,
	)

	const basicTrigger = new BasicTriggerCapability()
	const handler = async () => {
		switchModes(Mode.NODE)

		const consensusInput = create(SimpleConsensusInputsSchema, {
			observation: observationValue(val.string('hi')),
			descriptors: consensusDescriptorIdentical,
		})

		const consensusCapability = new ConsensusCapability()
		await consensusCapability.simple(toJson(SimpleConsensusInputsSchema, consensusInput))

		switchModes(Mode.DON)
		sendErrorWrapped('cannot use NodeRuntime outside RunInNodeMode')
	}

	try {
		const executeRequest = getRequest()
		await handleExecuteRequest(
			executeRequest,
			[cre.handler(basicTrigger.trigger({ name: 'first-trigger', number: 100 }), handler)],
			emptyConfig,
			basicRuntime,
		)
	} catch (e) {
		errorBoundary(e)
	}
}

main()
