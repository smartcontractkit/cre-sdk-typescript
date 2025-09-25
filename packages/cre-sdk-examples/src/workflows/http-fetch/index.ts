import {
  consensusMedianAggregation,
  cre,
  type NodeRuntime,
  type Runtime,
  Runner,
} from "@chainlink/cre-sdk";
import { z } from "zod";

const configSchema = z.object({
  schedule: z.string(),
  apiUrl: z.string(),
});

type Config = z.infer<typeof configSchema>;

const fetchMathResult = async (nodeRuntime: NodeRuntime<Config>) => {
  try {
    const httpCapability = new cre.capabilities.HTTPClient();
    const response = await httpCapability
      .sendRequest(nodeRuntime, {
        url: nodeRuntime.config.apiUrl,
      })
      .result();
    return Number.parseFloat(
      Buffer.from(response.body).toString("utf-8").trim()
    );
  } catch (error) {
    console.log("fetch error", error);
    return 0;
  }
};

const onCronTrigger = async (runtime: Runtime<Config>) => {
  return await runtime.runInNodeMode(
    fetchMathResult,
    consensusMedianAggregation()
  )();
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
    configSchema,
  });
  await runner.run(initWorkflow);
}

await main();
