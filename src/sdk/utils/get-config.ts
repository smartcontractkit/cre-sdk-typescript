import type { ExecuteRequest } from "@cre/generated/sdk/v1alpha/sdk_pb";
import { getRequest } from "./get-request";

export const getConfigFromExecuteRequest = (executeRequest: ExecuteRequest) => {
  const config = executeRequest.config;
  const configString = Buffer.from(config).toString();

  return JSON.parse(configString);
};

export const getConfig = () => {
  const executeRequest: ExecuteRequest = getRequest();
  return getConfigFromExecuteRequest(executeRequest);
};
