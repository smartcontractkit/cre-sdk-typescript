import { sendResponseValue } from "@cre/sdk/utils/send-response-value";
import { prepareRuntime } from "@cre/sdk/utils/prepare-runtime";
import { errorBoundary } from "@cre/sdk/utils/error-boundary";
import { Handler, Runner } from "@cre/sdk/workflow";
import { BasicActionCapability } from "@cre/generated-sdk/capabilities/internal/basicaction/v1/basicaction_sdk_gen";
import { BasicCapability as BasicTriggerCapability } from "@cre/generated-sdk/capabilities/internal/basictrigger/v1/basic_sdk_gen";
import { val } from "@cre/sdk/utils/values/value";

export async function main() {
  console.log(
    `TS workflow: standard test: capability calls are async [${new Date().toISOString()}]`
  );

  prepareRuntime();

  const basicTrigger = new BasicTriggerCapability();

  const asyncCalls = async (): Promise<string> => {
    const input1 = { inputThing: true };
    const input2 = { inputThing: false };
    const basicAction = new BasicActionCapability();
    const p1 = basicAction.performAction(input1);
    const p2 = basicAction.performAction(input2);
    const r2 = await p2;
    const r1 = await p1;
    return `${r1.adaptedThing}${r2.adaptedThing}`;
  };

  const initFn = async () => [
    Handler(
      basicTrigger.trigger({ name: "first-trigger", number: 100 }),
      asyncCalls
    ),
  ];

  try {
    const results = await new Runner().run(initFn);
    const out = String(results[0] ?? "");
    sendResponseValue(val.string(out));
  } catch (e) {
    errorBoundary(e);
  }
}

main();
