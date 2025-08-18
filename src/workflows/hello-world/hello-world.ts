import { z } from "zod";
import { prepareRuntime } from "@cre/sdk/utils/prepare-runtime";
import { Handler, Runner } from "@cre/sdk/workflow";
import { CronCapability } from "@cre/generated-sdk/capabilities/scheduler/cron/v1/cron_sdk_gen";
import type { Environment } from "@cre/sdk/workflow";
import { getConfig } from "@cre/sdk/utils/get-config";

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
const initWorkflow = (env: Environment<Config>) => {
  const cron = new CronCapability();

  return [
    Handler(
      // Use the schedule from our config file
      cron.trigger({ schedule: env.config?.schedule }),
      onCronTrigger
    ),
  ];
};

// main is the entry point for the workflow
export async function main(): Promise<void> {
  console.log(`\n\n\nTS workflow: hello-world [${new Date().toISOString()}]`);

  prepareRuntime();
  versionV2();

  const config = getConfig();
  const configParsed = configSchema.parse(config);

  const runner = new Runner<Config>(configParsed);
  await runner.run(initWorkflow);
}

main();
