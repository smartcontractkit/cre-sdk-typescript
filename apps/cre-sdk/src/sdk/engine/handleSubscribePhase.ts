import { create, toBinary } from '@bufbuild/protobuf'
import type { ExecuteRequest, ExecutionResult } from '@cre/generated/sdk/v1alpha/sdk_pb'
import {
	ExecutionResultSchema,
	TriggerSubscriptionRequestSchema,
} from '@cre/generated/sdk/v1alpha/sdk_pb'
import { hostBindings } from '@cre/sdk/runtime/host-bindings'
import type { Workflow } from '@cre/sdk/workflow'

export const handleSubscribePhase = <TConfig>(
	req: ExecuteRequest,
	workflow: Workflow<TConfig>,
): undefined => {
	if (req.request.case !== 'subscribe') {
		return
	}

	// Build TriggerSubscriptionRequest from the workflow entries
	const subscriptions = workflow.map((entry) => ({
		id: entry.trigger.capabilityId(),
		method: entry.trigger.method(),
		payload: entry.trigger.configAsAny(),
	}))

	const subscriptionRequest = create(TriggerSubscriptionRequestSchema, {
		subscriptions,
	})

	// Wrap in ExecutionResult.triggerSubscriptions
	const execResult: ExecutionResult = create(ExecutionResultSchema, {
		result: { case: 'triggerSubscriptions', value: subscriptionRequest },
	})

	const encoded = toBinary(ExecutionResultSchema, execResult)
	hostBindings.sendResponse(encoded)
}
