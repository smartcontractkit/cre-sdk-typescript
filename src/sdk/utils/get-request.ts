import { fromBinary } from "@bufbuild/protobuf";
import { ExecuteRequestSchema } from "@cre/generated/sdk/v1alpha/sdk_pb";

export const getRequest = () => {
  const argsString = getWasiArgs();
  const args = JSON.parse(argsString);

  // SDK expects exactly 2 args:
  // 1st is the script name
  // 2nd is the base64 encoded request
  if (args.length !== 2) {
    throw new Error("Invalid request: must contain payload");
  }

  const base64Request = args[1];

  const bytes = Buffer.from(base64Request, "base64");
  return fromBinary(ExecuteRequestSchema, bytes);
};
