/**
 * Public API for the CRE SDK.
 */
import { prepareRuntime } from "@cre/sdk/utils/prepare-runtime";
import { handler, Runner } from "@cre/sdk/workflow";
import { configHandler } from "@cre/sdk/utils/config";
import { runInNodeMode } from "@cre/sdk/runtime/run-in-node-mode";
import { CronCapability } from "@cre/generated-sdk/capabilities/scheduler/cron/v1/cron_sdk_gen";
import { ClientCapability as EVMClient } from "@cre/generated-sdk/capabilities/blockchain/evm/v1alpha/client_sdk_gen";
import { ClientCapability as HTTPClient } from "@cre/generated-sdk/capabilities/networking/http/v1alpha/client_sdk_gen";
import { val } from "@cre/sdk/utils/values/value";
import { getAggregatedValue } from "@cre/sdk/utils/values/consensus";
import { creFetch } from "@cre/sdk/utils/capabilities/http/fetch";
import { sendResponseValue } from "@cre/sdk/utils/send-response-value";

export type { Runtime } from "@cre/sdk/runtime/runtime";

prepareRuntime();
versionV2();

export const cre = {
  capabilities: {
    CronCapability,
    HTTPClient,
    EVMClient,
  },
  config: configHandler,
  handler,
  newRunner: Runner.newRunner,
  runInNodeMode,
  utils: {
    val,
    consensus: {
      getAggregatedValue,
    },
    fetch: creFetch,
  },
  sendResponseValue,
};
