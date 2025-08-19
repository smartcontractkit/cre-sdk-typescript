import type { ExecuteRequest } from "@cre/generated/sdk/v1alpha/sdk_pb";
import { getRequest } from "./get-request";

export const getConfigFromExecuteRequest = (executeRequest: ExecuteRequest) => {
  const config = executeRequest.config;
  const configString = Buffer.from(config).toString();

  try {
    return JSON.parse(configString);
  } catch (e) {
    if (typeof configString === "string") {
      return configString;
    }

    if (e instanceof Error) {
      console.error(e.message);
      console.error(e.stack);
    }

    throw e;
  }
};

export const getConfig = () => {
  const executeRequest: ExecuteRequest = getRequest();
  return getConfigFromExecuteRequest(executeRequest);
};
