import { z } from "zod";
import { cre, type Environment } from "@cre/sdk/cre";
import { useMedianConsensus } from "@cre/sdk/utils/values/consensus-decorators";
import { Workflow } from "@cre/sdk/base-workflow";
import { type HandlerEntry } from "@cre/sdk/workflow";

// Config struct defines the parameters that can be passed to the workflow
const configSchema = z.object({
  schedule: z.string(),
  apiUrl: z.string(),
});

type Config = z.infer<typeof configSchema>;

class HttpFetchWorkflow extends Workflow<Config> {
  @useMedianConsensus("float64")
  async fetchMathResult(config: Config): Promise<number> {
    // Using inherited fetchData method for cleaner error handling
    const response = await cre.utils.fetch({ url: config.apiUrl });
    return Number.parseFloat(response.body);
  }

  // Override the abstract onCronTrigger method
  async onCronTrigger(env: Environment<Config>) {
    const aggregatedValue = await this.fetchMathResult(env.config);
    cre.sendResponseValue(cre.utils.val.mapValue({ Result: aggregatedValue }));
  }

  initHandlers(env: Environment<Config>) {
    const cron = new cre.capabilities.CronCapability();

    return [
      cre.handler(
        cron.trigger({ schedule: env.config.schedule }),
        this.onCronTrigger
      ),
    ] as HandlerEntry[];
  }
}

// main is the entry point for the workflow
export async function main() {
  await new HttpFetchWorkflow({ configSchema }).run();
}

main();
