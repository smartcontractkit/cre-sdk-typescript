import type {
  ExecuteRequest,
  CapabilityResponse,
  ExecutionResult,
} from "@cre/generated/sdk/v1alpha/sdk_pb";
import {
  TriggerSubscriptionRequestSchema,
  ExecutionResultSchema,
} from "@cre/generated/sdk/v1alpha/sdk_pb";
import { fromBinary, create, toBinary } from "@bufbuild/protobuf";
import type { Workflow, Environment, Runtime } from "@cre/sdk/workflow";
import { getTypeUrl } from "@cre/sdk/utils/typeurl";
import { buildEnvFromExecuteRequest } from "@cre/sdk/utils/env";

export const handleExecuteRequest = async <TConfig>(
  req: ExecuteRequest,
  workflow: Workflow<TConfig>,
  env: Environment<TConfig> = {},
  rt: Runtime = {}
): Promise<CapabilityResponse | void> => {
  if (req.request.case === "subscribe") {
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
    sendResponse(Buffer.from(encoded).toString("base64"));
    return undefined;
  }

  if (req.request.case === "trigger") {
    const triggerMsg = req.request.value;
    const index = Number(triggerMsg.id);
    if (Number.isFinite(index) && index >= 0 && index < workflow.length) {
      const entry = workflow[index];
      const schema = entry.trigger.outputSchema();
      const payloadAny = triggerMsg.payload;
      if (!payloadAny) return undefined;

      // Extra safety: verify payload typeUrl matches expected schema type
      const expectedTypeUrl = getTypeUrl(schema);
      if (payloadAny.typeUrl && payloadAny.typeUrl !== expectedTypeUrl) {
        return undefined;
      }

      /**
       * Note: do not hardcode method name; routing by id is authoritative.
       *
       * This matches the GO SDK behavior, which also just checks for the id.
       *
       * @see https://github.com/smartcontractkit/cre-sdk-go/blob/5a41d81e3e072008484e85dc96d746401aafcba2/cre/wasm/runner.go#L81
       * */
      const decoded = fromBinary(schema, payloadAny.value);
      const adapted = await entry.trigger.adapt(decoded);
      const handlerEnv: Environment<TConfig> =
        env || buildEnvFromExecuteRequest<TConfig>(req);
      await entry.fn(handlerEnv, rt, adapted);
    }
  }
};
