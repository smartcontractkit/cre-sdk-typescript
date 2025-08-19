import { sendResponseValue } from "@cre/sdk/utils/send-response-value";
import { errorBoundary } from "@cre/sdk/utils/error-boundary";
import { cre } from "@cre/sdk/cre";
import { BasicActionCapability } from "@cre/generated-sdk/capabilities/internal/basicaction/v1/basicaction_sdk_gen";
import { BasicCapability as BasicTriggerCapability } from "@cre/generated-sdk/capabilities/internal/basictrigger/v1/basic_sdk_gen";
import { val } from "@cre/sdk/utils/values/value";

export async function main() {
  console.log(
    `TS workflow: standard test: capability calls are async [${new Date().toISOString()}]`
  );

  const basicTrigger = new BasicTriggerCapability();

  const asyncCalls = async (): Promise<void> => {
    const input1 = { inputThing: true };
    const input2 = { inputThing: false };
    const basicAction = new BasicActionCapability();
    const p1 = basicAction.performAction(input1);
    const p2 = basicAction.performAction(input2);
    const r2 = await p2;
    const r1 = await p1;

    sendResponseValue(val.string(`${r1.adaptedThing}${r2.adaptedThing}`));
  };

  const initFn = async () => [
    cre.handler(
      basicTrigger.trigger({ name: "first-trigger", number: 100 }),
      asyncCalls
    ),
  ];

  try {
    const runner = await cre.newRunner();
    runner.run(initFn);
  } catch (e) {
    errorBoundary(e);
  }
}

main();
