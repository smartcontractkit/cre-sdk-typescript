import { cre, type Environment } from "@cre/sdk/cre";

// Config struct defines the parameters that can be passed to the workflow
type Config = {
  schedule: string;
};

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
  const runner = await cre.newRunner<Config>();
  await runner.run(initWorkflow);
}

main();
