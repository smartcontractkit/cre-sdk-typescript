import { prepareRuntime } from "@cre/sdk/utils/prepare-runtime";
import { errorBoundary } from "@cre/sdk/utils/error-boundary";
import { handler } from "@cre/sdk/workflow";
import { getRequest } from "@cre/sdk/utils/get-request";
import { handleExecuteRequest } from "@cre/sdk/engine/execute";
import { type ExecuteRequest } from "@cre/generated/sdk/v1alpha/sdk_pb";
import { BasicCapability as BasicTriggerCapability } from "@cre/generated-sdk/capabilities/internal/basictrigger/v1/basic_sdk_gen";
import { BasicCapability as ActionAndTriggerCapability } from "@cre/generated-sdk/capabilities/internal/actionandtrigger/v1/basic_sdk_gen";
import { sendResponseValue } from "@cre/sdk/utils/send-response-value";
import { val } from "@cre/sdk/utils/values/value";
import { basicRuntime, emptyEnv } from "@cre/sdk/testhelpers/mocks";

const buildWorkflow = () => {
  const basicTrigger = new BasicTriggerCapability();
  const actionTrigger = new ActionAndTriggerCapability();

  return [
    handler(
      basicTrigger.trigger({ name: "first-trigger", number: 100 }),
      (_env, _rt, out) =>
        sendResponseValue(val.string(`called 0 with ${out.coolOutput}`))
    ),
    handler(
      actionTrigger.trigger({ name: "second-trigger", number: 150 }),
      (_env, _rt, out) =>
        sendResponseValue(val.string(`called 1 with ${out.coolOutput}`))
    ),
    handler(
      basicTrigger.trigger({ name: "third-trigger", number: 200 }),
      (_env, _rt, out) =>
        sendResponseValue(val.string(`called 2 with ${out.coolOutput}`))
    ),
  ];
};

export async function main() {
  console.log(
    `TS workflow: standard test: multiple_triggers [${new Date().toISOString()}]`
  );

  prepareRuntime();
  versionV2();

  try {
    const executeRequest: ExecuteRequest = getRequest();
    const workflow = buildWorkflow();
    await handleExecuteRequest(
      executeRequest,
      workflow,
      emptyEnv,
      basicRuntime
    );
  } catch (e) {
    errorBoundary(e);
  }
}

main();
