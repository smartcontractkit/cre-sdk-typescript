import { z } from "zod";
import { prepareRuntime } from "@cre/sdk/utils/prepare-runtime";
import { Handler } from "@cre/sdk/workflow";
import { CronCapability } from "@cre/generated-sdk/capabilities/scheduler/cron/v1/cron_sdk_gen";
import type { Environment } from "@cre/sdk/workflow";
import { getConfigFromExecuteRequest } from "@cre/sdk/utils/get-config";
import { handleExecuteRequest } from "@cre/sdk/engine/execute";
import type { ExecuteRequest } from "@cre/generated/sdk/v1alpha/sdk_pb";
import { getRequest } from "@cre/sdk/utils/get-request";

// Config struct defines the parameters that can be passed to the workflow
const configSchema = z.object({
  schedule: z.string(),
});

type Config = z.infer<typeof configSchema>;

// onCronTrigger is the callback function that gets executed when the cron trigger fires
const onCronTrigger = (env: Environment<Config>): void => {
  env.logger?.log("Hello, Calculator! Workflow triggered.");
};

// InitWorkflow is the required entry point for a CRE workflow
// The runner calls this function to initialize the workflow and register its handlers
const initWorkflow = (config: Config) => {
  const cron = new CronCapability();

  return [
    Handler(
      // Use the schedule from our config file
      cron.trigger({ schedule: config.schedule }),
      onCronTrigger
    ),
  ];
};

// main is the entry point for the workflow
export async function main(): Promise<void> {
  console.log(`\n\n\nTS workflow: hello-world [${new Date().toISOString()}]`);

  prepareRuntime();
  versionV2();

  const executeRequest: ExecuteRequest = getRequest();
  const config = getConfigFromExecuteRequest(executeRequest);
  const configParsed = configSchema.parse(config);

  const workflow = initWorkflow(configParsed);

  await handleExecuteRequest(executeRequest, workflow);
}

main();
