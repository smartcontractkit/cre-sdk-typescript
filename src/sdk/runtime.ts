import { Mode } from "@cre/generated/sdk/v1alpha/sdk_pb";
import { logger, type Logger } from "@cre/sdk/logger";

export type Runtime = {
  mode: Mode;
  logger: Logger;
};

export const runtime: Runtime = {
  mode: Mode.DON,
  logger,
};
