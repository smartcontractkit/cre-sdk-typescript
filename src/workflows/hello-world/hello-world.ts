import { z } from "zod";
import { cre, type Environment } from "@cre/sdk/cre";

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
  const cron = new cre.capabilities.CronCapability();

  return [
    cre.handler(
      // Use the schedule from our config file
      cron.trigger({ schedule: env.config?.schedule }),
      onCronTrigger
    ),
  ];
};

// main is the entry point for the workflow
export async function main() {
  const config = cre.getConfig();
  const configParsed = configSchema.parse(config);

  const runner = new cre.Runner<Config>(configParsed);
  await runner.run(initWorkflow);
}

main();
