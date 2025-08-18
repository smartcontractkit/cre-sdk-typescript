import { prepareRuntime } from "@cre/sdk/utils/prepare-runtime";
import { sendResponseValue } from "@cre/sdk/utils/send-response-value";
import { sendErrorWrapped } from "@cre/sdk/testhelpers/send-error-wrapped";
import { SecretsError } from "@cre/sdk/utils/secrets-error";
import { errorBoundary } from "@cre/sdk/utils/error-boundary";
import { getSecret } from "@cre/sdk/utils/get-secret";
import { val } from "@cre/sdk/utils/values/value";
import { Handler } from "@cre/sdk/workflow";
import { handleExecuteRequest } from "@cre/sdk/engine/execute";
import { getRequest } from "@cre/sdk/utils/get-request";
import { BasicCapability as BasicTriggerCapability } from "@cre/generated-sdk/capabilities/internal/basictrigger/v1/basic_sdk_gen";

export async function main() {
  console.log(
    `TS workflow: standard test: secrets [${new Date().toISOString()}]`
  );

  prepareRuntime();
  versionV2();

  const basicTrigger = new BasicTriggerCapability();
  const workflow = [
    Handler(
      basicTrigger.trigger({ name: "first-trigger", number: 100 }),
      async () => {
        const secret = await getSecret("Foo");
        sendResponseValue(val.string(secret));
      }
    ),
  ];

  try {
    const executeRequest = getRequest();
    await handleExecuteRequest(executeRequest, workflow);
  } catch (e) {
    if (e instanceof SecretsError) {
      sendErrorWrapped(e.message);
    } else {
      errorBoundary(e);
    }
  }
}

main();
