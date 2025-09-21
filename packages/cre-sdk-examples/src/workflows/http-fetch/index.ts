import {
  cre,
  type NodeRuntime,
  withErrorBoundary,
  Value,
  consensusMedianAggregation,
} from "@chainlink/cre-sdk";

import { z } from "zod";

const configSchema = z.object({
  schedule: z.string(),
  apiUrl: z.string(),
});

type Config = z.infer<typeof configSchema>;

const fetchMathResult = async (_: NodeRuntime, config: Config) => {
  const response = await cre.utils.fetch({
    url: config.apiUrl,
  });
  return Number.parseFloat(response.body.trim());
};

const onCronTrigger = async (config: Config) => {
  const aggregatedValue = await cre.runInNodeMode(
    fetchMathResult,
    consensusMedianAggregation()
  )(config);
  cre.sendResponseValue(Value.from(aggregatedValue));
};

const initWorkflow = (config: Config) => {
  const cron = new cre.capabilities.CronCapability();

  return [
    cre.handler(cron.trigger({ schedule: config.schedule }), onCronTrigger),
  ];
};

export async function main() {
  const runner = await cre.newRunner<Config>({
    configSchema,
  });
  await runner.run(initWorkflow);
}

withErrorBoundary(main);
