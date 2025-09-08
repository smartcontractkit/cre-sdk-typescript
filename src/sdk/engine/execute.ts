import type { ExecuteRequest, CapabilityResponse } from '@cre/generated/sdk/v1alpha/sdk_pb'
import type { Workflow } from '@cre/sdk/workflow'
import type { Runtime } from '@cre/sdk/runtime/runtime'
import { handleSubscribePhase } from './handleSubscribePhase'
import { handleExecutionPhase } from './handleExecutionPhase'

export const handleExecuteRequest = async <TConfig>(
	req: ExecuteRequest,
	workflow: Workflow<TConfig>,
	config: TConfig,
	runtime: Runtime,
): Promise<CapabilityResponse | void> => {
	if (req.request.case === 'subscribe') {
		return handleSubscribePhase(req, workflow)
	}

	if (req.request.case === 'trigger') {
		return handleExecutionPhase(req, workflow, config, runtime)
	}
}
