import { Mode } from "@cre/generated/sdk/v1alpha/sdk_pb";
import type { Environment } from "@cre/sdk/environment";
import { logger } from "@cre/sdk/logger";
import type { Runtime } from "@cre/sdk/runtime";

export const emptyEnv: Environment = {
  config: {},
};

export const basicRuntime: Runtime = {
  mode: Mode.DON,
  logger,
};
