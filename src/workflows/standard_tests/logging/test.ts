import { cre, type Runtime } from "@cre/sdk/cre";
import { BasicCapability as BasicTriggerCapability } from "@cre/generated-sdk/capabilities/internal/basictrigger/v1/basic_sdk_gen";
import { withErrorBoundary } from "@cre/sdk/utils/error-boundary";

type Config = "config";

const doLog = (config: Config, runtime: Runtime) => {
  runtime.logger.log("log from wasm!");
  cre.sendResponseValue(cre.utils.val.string(config));
};

const initWorkflow = (config: Config) => {
  const basicTrigger = new BasicTriggerCapability();

  return [cre.handler(basicTrigger.trigger({}), doLog)];
};

export async function main() {
  console.log(
    `TS workflow: standard test: logging [${new Date().toISOString()}]`
  );

  const runner = await cre.newRunner<Config>();
  await runner.run(initWorkflow);
}

withErrorBoundary(main);
