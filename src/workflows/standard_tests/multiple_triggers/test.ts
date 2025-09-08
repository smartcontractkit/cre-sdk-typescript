import { BasicCapability as BasicTriggerCapability } from "@cre/generated-sdk/capabilities/internal/basictrigger/v1/basic_sdk_gen";
import { BasicCapability as ActionAndTriggerCapability } from "@cre/generated-sdk/capabilities/internal/actionandtrigger/v1/basic_sdk_gen";
import { type Outputs } from "@cre/generated/capabilities/internal/basictrigger/v1/basic_trigger_pb";
import { type TriggerEvent } from "@cre/generated/capabilities/internal/actionandtrigger/v1/action_and_trigger_pb";
import { cre, type Runtime } from "@cre/sdk/cre";

// Doesn't matter for this test
type Config = any;

const doLog0 = (_config: Config, _runtime: Runtime, output: Outputs) => {
  cre.sendResponseValue(
    cre.utils.val.string(`called 0 with ${output.coolOutput}`)
  );
};

const doLog1 = (_config: Config, _runtime: Runtime, output: TriggerEvent) => {
  cre.sendResponseValue(
    cre.utils.val.string(`called 1 with ${output.coolOutput}`)
  );
};

const doLog2 = (_config: Config, _runtime: Runtime, output: Outputs) => {
  cre.sendResponseValue(
    cre.utils.val.string(`called 2 with ${output.coolOutput}`)
  );
};

const initWorkflow = () => {
  const basicTrigger = new BasicTriggerCapability();
  const actionTrigger = new ActionAndTriggerCapability();

  return [
    cre.handler(
      basicTrigger.trigger({ name: "first-trigger", number: 100 }),
      doLog0
    ),
    cre.handler(
      actionTrigger.trigger({ name: "second-trigger", number: 150 }),
      doLog1
    ),
    cre.handler(
      basicTrigger.trigger({ name: "third-trigger", number: 200 }),
      doLog2
    ),
  ];
};

export async function main() {
  console.log(
    `TS workflow: standard test: logging [${new Date().toISOString()}]`
  );

  const runner = await cre.newRunner<Config>();
  await runner.run(initWorkflow);
}

cre.withErrorBoundary(main);
