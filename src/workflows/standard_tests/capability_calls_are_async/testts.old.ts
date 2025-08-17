import { sendResponseValue } from "@cre/sdk/utils/send-response-value";
import { prepareRuntime } from "@cre/sdk/utils/prepare-runtime";
import { errorBoundary } from "@cre/sdk/utils/error-boundary";
import { BasicActionCapability } from "@cre/generated-sdk/capabilities/internal/basicaction/v1/basicaction_sdk_gen";
import { val } from "@cre/sdk/utils/values/value";

export async function main() {
  console.log(
    `TS workflow: standard test: capability calls are async [${new Date().toISOString()}]`
  );

  prepareRuntime();

  const input1 = { inputThing: true };
  const input2 = { inputThing: false };

  try {
    const basicActionCapability = new BasicActionCapability();
    const promise1 = basicActionCapability.performAction(input1);
    const promise2 = basicActionCapability.performAction(input2);

    const result2 = await promise2;
    const result1 = await promise1;

    sendResponseValue(
      val.string(`${result1.adaptedThing}${result2.adaptedThing}`)
    );
  } catch (e) {
    errorBoundary(e);
  }
}

main();
