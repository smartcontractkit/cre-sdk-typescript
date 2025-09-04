import { z } from "zod";
import { cre } from "@cre/sdk/cre";
import { useMedianConsensus } from "@cre/sdk/utils/values/consensus-hooks";
import { withErrorBoundary } from "@cre/sdk/utils/error-boundary";

const configSchema = z.object({
  schedule: z.string(),
  apiUrl: z.string(),
});

type Config = z.infer<typeof configSchema>;

const fetchMathResult = useMedianConsensus(async (config: Config) => {
  try {
    const response = await cre.utils.fetch({
      url: config.apiUrl,
    });
    return Number.parseFloat(response.body.trim());
  } catch (error) {
    console.log("fetch error", error);
    return 0;
  }
}, "float64");

const onCronTrigger = async (config: Config) => {
  const aggregatedValue = await fetchMathResult(config);
  cre.sendResponseValue(cre.utils.val.mapValue({ Result: aggregatedValue }));
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
