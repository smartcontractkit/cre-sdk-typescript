import { cre, type Runtime, Runner } from "@chainlink/cre-sdk";

type Config = {
  schedule: string;
};

const onCronTrigger = (_: Runtime<Config>): string => {
  console.log("Hello, Calculator! Workflow triggered.");
  return "Hello, Calculator!";
};

const initWorkflow = (config: Config) => {
  const cron = new cre.capabilities.CronCapability();

  return [
    cre.handler(cron.trigger({ schedule: config.schedule }), onCronTrigger),
  ];
};

export async function main() {
  const runner = await Runner.newRunner<Config>({
    configParser: (b: Uint8Array) => JSON.parse(Buffer.from(b).toString()),
  });
  await runner.run(initWorkflow);
}

await main();
