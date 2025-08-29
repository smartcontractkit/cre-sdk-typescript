import {
  GetSecretsRequestSchema,
  Mode,
} from "@cre/generated/sdk/v1alpha/sdk_pb";
import { create, toBinary } from "@bufbuild/protobuf";
import {
  getLastCallbackId,
  incrementCallbackId,
} from "@cre/sdk/utils/capabilities/callback-id";

export const doGetSecret = (id: string) => {
  const callbackId = getLastCallbackId(Mode.DON);
  incrementCallbackId(Mode.DON);

  const request = create(GetSecretsRequestSchema, {
    requests: [{ id }],
    callbackId,
  });

  getSecrets(
    Buffer.from(toBinary(GetSecretsRequestSchema, request)).toString("utf-8"),
    1024 * 1024
  );

  return callbackId;
};
