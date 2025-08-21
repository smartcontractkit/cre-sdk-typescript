import { z } from "zod";
import { cre, type Environment } from "@cre/sdk/cre";

// Config struct defines the parameters that can be passed to the workflow
const configSchema = z.object({
  schedule: z.string(),
  apiUrl: z.string(),
});

type Config = z.infer<typeof configSchema>;

// This is where you fetch your offchain data
const fetchMathResult = async (config: Config) => {
  const response = await cre.utils.fetch({
    url: config.apiUrl,
  });
  return Number.parseFloat(response.body.trim());
};

// This is how you guide nodes how to agree on a result
const fetchAggregatedResult = async (config: Config) =>
  cre.runInNodeMode(async () => {
    const result = await fetchMathResult(config);
    return cre.utils.consensus.getAggregatedValue(
      cre.utils.val.float64(result),
      "median"
    );
  });

// This is your handler which will perform the desired action
const onCronTrigger = async (env: Environment<Config>) => {
  const aggregatedValue = await fetchAggregatedResult(env.config);
  cre.sendResponseValue(cre.utils.val.mapValue({ Result: aggregatedValue }));
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
  try {
    const runner = await cre.newRunner<Config>({
      configSchema: configSchema,
    });
    await runner.run(initWorkflow);
  } catch (error) {
    console.log("error", JSON.stringify(error, null, 2));
  }
}

main();
