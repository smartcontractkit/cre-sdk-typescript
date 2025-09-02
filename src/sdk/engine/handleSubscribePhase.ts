import { create, toBinary } from "@bufbuild/protobuf";
import type {
  ExecutionResult,
  ExecuteRequest,
} from "@cre/generated/sdk/v1alpha/sdk_pb";
import {
  TriggerSubscriptionRequestSchema,
  ExecutionResultSchema,
} from "@cre/generated/sdk/v1alpha/sdk_pb";
import type { Workflow } from "@cre/sdk/workflow";
import { host } from "@cre/sdk/utils/host";

export const handleSubscribePhase = <TConfig>(
  req: ExecuteRequest,
  workflow: Workflow<TConfig>
) => {
  if (req.request.case !== "subscribe") {
    return;
  }

  // Build TriggerSubscriptionRequest from the workflow entries
  const subscriptions = workflow.map((entry) => ({
    id: entry.trigger.capabilityId(),
    method: entry.trigger.method(),
    payload: entry.trigger.configAsAny(),
  }));

  const subscriptionRequest = create(TriggerSubscriptionRequestSchema, {
    subscriptions,
  });

  // Wrap in ExecutionResult.triggerSubscriptions
  const execResult: ExecutionResult = create(ExecutionResultSchema, {
    result: { case: "triggerSubscriptions", value: subscriptionRequest },
  });

  const encoded = toBinary(ExecutionResultSchema, execResult);
  host.sendResponse(Buffer.from(encoded).toString("base64"));
};
