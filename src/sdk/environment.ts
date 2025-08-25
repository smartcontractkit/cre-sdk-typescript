import type { ExecuteRequest } from "@cre/generated/sdk/v1alpha/sdk_pb";

export type Environment<TConfig = unknown> = {
  config: TConfig;
};

export const buildEnvFromExecuteRequest = <TConfig>(
  req: ExecuteRequest,
  baseEnv?: Environment<TConfig>
): Environment<TConfig> => {
  const merged: Environment<TConfig> = {
    ...(baseEnv ?? {}),
    config: req.config as unknown as TConfig,
  };
  return merged;
};

export const buildEnvFromConfig = <TConfig>(
  config: TConfig
): Environment<TConfig> => ({
  config,
});
