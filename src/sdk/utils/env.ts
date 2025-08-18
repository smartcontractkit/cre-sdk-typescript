import type { ExecuteRequest } from "@cre/generated/sdk/v1alpha/sdk_pb";
import type { Environment } from "@cre/sdk/workflow";

export const buildEnvFromExecuteRequest = <TConfig>(
  req: ExecuteRequest,
  baseEnv?: Environment<TConfig>
): Environment<TConfig> => {
  const merged: Environment<TConfig> = {
    ...(baseEnv ?? {}),
    config: req.config as unknown as TConfig,
    logger: baseEnv?.logger ?? {
      log: (message: string) => log(String(message)),
    },
  };
  return merged;
};

export const buildEnvFromConfig = <TConfig>(
  config: TConfig
): Environment<TConfig> => {
  return {
    config,
    logger: {
      log: (message: string) => log(String(message)),
    },
  };
};
