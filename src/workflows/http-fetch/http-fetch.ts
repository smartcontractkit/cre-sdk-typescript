import { z } from "zod";
import { prepareRuntime } from "@cre/sdk/utils/prepare-runtime";
import { Handler } from "@cre/sdk/workflow";
import { CronCapability } from "@cre/generated-sdk/capabilities/scheduler/cron/v1/cron_sdk_gen";
import type { Environment } from "@cre/sdk/workflow";
import { getConfigFromExecuteRequest } from "@cre/sdk/utils/get-config";
import { handleExecuteRequest } from "@cre/sdk/engine/execute";
import type { ExecuteRequest } from "@cre/generated/sdk/v1alpha/sdk_pb";
import { getRequest } from "@cre/sdk/utils/get-request";
import { runInNodeMode } from "@cre/sdk/runtime/run-in-node-mode";
import { ClientCapability as HTTPClient } from "@cre/generated-sdk/capabilities/networking/http/v1alpha/client_sdk_gen";
import { SimpleConsensusInputsSchema } from "@cre/generated/sdk/v1alpha/sdk_pb";
import { create } from "@bufbuild/protobuf";
import {
  consensusDescriptorMedian,
  observationValue,
} from "@cre/sdk/utils/values/consensus";
import { sendResponseValue } from "@cre/sdk/utils/send-response-value";
import { val } from "@cre/sdk/utils/values/value";
import { buildEnvFromConfig } from "@cre/sdk/utils/env";

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
    const http = new HTTPClient();
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
  console.log(`\n\n\nTS workflow: http-fetch [${new Date().toISOString()}]`);

  prepareRuntime();
  versionV2();

  try {
    const executeRequest: ExecuteRequest = getRequest();
    const config = getConfigFromExecuteRequest(executeRequest);
    const configParsed = configSchema.parse(config);
    const env = buildEnvFromConfig<Config>(configParsed);

    const workflow = initWorkflow(env);
    await handleExecuteRequest(executeRequest, workflow, env);
  } catch (error) {
    console.log("error", JSON.stringify(error, null, 2));
  }
}

main();
