import { Mode } from "@cre/generated/sdk/v1alpha/sdk_pb";
import { logger } from "@cre/sdk/logger";
import type { Runtime } from "@cre/sdk/runtime";

export const emptyConfig = {};

export const basicRuntime: Runtime = {
  mode: Mode.DON,
  logger,
};
