import { BasicActionCapability } from "@cre/generated-sdk/capabilities/internal/basicaction/v1/basicaction_sdk_gen";
import { BasicCapability as BasicTriggerCapability } from "@cre/generated-sdk/capabilities/internal/basictrigger/v1/basic_sdk_gen";
import { cre, type Runtime } from "@cre/sdk/cre";
import { consensusIdenticalAggregation } from "@cre/sdk/utils";
import { Runner } from "@cre/sdk/wasm";

const handler = async (runtime: Runtime<Uint8Array>) => {
  return await runtime.runInNodeMode(async () => {
    const basicCap = new BasicActionCapability();
    return (await basicCap.performAction(runtime, { inputThing: true }).result())
      .adaptedThing;
  }, consensusIdenticalAggregation())();
};

const initWorkflow = () => {
  const basicTrigger = new BasicTriggerCapability();

  return [cre.handler(basicTrigger.trigger({}), handler)];
};

export async function main() {
  console.log(
    `TS workflow: standard test: mode_switch: successful_mode_switch [${new Date().toISOString()}]`
  );

  const runner = await Runner.newRunner<Uint8Array>({});
  await runner.run(initWorkflow);
}

await main();
