import { z } from "zod";
import { cre, type Environment } from "@cre/sdk/cre";
import { runInNodeMode } from "@cre/sdk/runtime/run-in-node-mode";
import { SimpleConsensusInputsSchema } from "@cre/generated/sdk/v1alpha/sdk_pb";
import { create } from "@bufbuild/protobuf";
import {
  consensusDescriptorMedian,
  observationValue,
} from "@cre/sdk/utils/values/consensus";
import { sendResponseValue } from "@cre/sdk/utils/send-response-value";
import { val } from "@cre/sdk/utils/values/value";

// Config struct defines the parameters that can be passed to the workflow
const configSchema = z.object({
  schedule: z.string(),
  apiUrl: z.string(),
});

type Config = z.infer<typeof configSchema>;

// onCronTrigger is the callback function that gets executed when the cron trigger fires
const onCronTrigger = async (env: Environment<Config>): Promise<void> => {
  env.logger?.log("Hello, Calculator! Workflow triggered.");

  const aggregatedValue = await runInNodeMode(async () => {
    const http = new cre.capabilities.HTTPClient();
    const resp = await http.sendRequest({
      url: env.config?.apiUrl,
      method: "GET",
    });

    const bodyStr = new TextDecoder().decode(resp.body);
    const num = Number.parseFloat(bodyStr.trim());

    return create(SimpleConsensusInputsSchema, {
      observation: observationValue(val.float64(num)),
      descriptors: consensusDescriptorMedian,
    });
  });

  sendResponseValue(val.mapValue({ Result: aggregatedValue }));
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
    const config = cre.getConfig();
    const configParsed = configSchema.parse(config);

    const runner = new cre.Runner<Config>(configParsed);
    await runner.run(initWorkflow);
  } catch (error) {
    console.log("error", JSON.stringify(error, null, 2));
  }
}

main();
