import {
	type CapabilityResponse,
	type ExecuteRequest,
	Mode,
} from '@cre/generated/sdk/v1alpha/sdk_pb'
import type { Runtime } from '@cre/sdk/runtime/runtime'
import type { Workflow } from '@cre/sdk/workflow'
import { handleExecutionPhase } from './handleExecutionPhase'
import { handleSubscribePhase } from './handleSubscribePhase'

export const handleExecuteRequest = async <TConfig>(
	req: ExecuteRequest,
	workflow: Workflow<TConfig>,
	config: TConfig,
	runtime: Runtime,
): Promise<CapabilityResponse | undefined> => {
	if (req.request.case === 'subscribe') {
		return handleSubscribePhase(req, workflow)
	}

	if (req.request.case === 'trigger') {
		runtime.switchModes(Mode.DON)
		return handleExecutionPhase(req, workflow, config, runtime)
	}
}
