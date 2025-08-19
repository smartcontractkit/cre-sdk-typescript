/**
 * Public API for the CRE SDK.
 */
import { prepareRuntime } from "@cre/sdk/utils/prepare-runtime";
import { handler, Runner } from "@cre/sdk/workflow";
import { configHandler } from "@cre/sdk/utils/config";
import { CronCapability } from "@cre/generated-sdk/capabilities/scheduler/cron/v1/cron_sdk_gen";
import { ClientCapability as HTTPClient } from "@cre/generated-sdk/capabilities/networking/http/v1alpha/client_sdk_gen";

export type { Environment } from "@cre/sdk/workflow";

prepareRuntime();
versionV2();

export const cre = {
  capabilities: {
    CronCapability,
    HTTPClient,
  },
  config: configHandler,
  handler,
  newRunner: Runner.newRunner,
};
