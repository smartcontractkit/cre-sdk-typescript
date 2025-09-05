import {
  type CapabilityRequest,
  CapabilityRequestSchema,
  Mode,
} from "@cre/generated/sdk/v1alpha/sdk_pb";
import { create, toBinary } from "@bufbuild/protobuf";
import {
  getLastCallbackId,
  incrementCallbackId,
} from "@cre/sdk/utils/capabilities/callback-id";

type Params = {
  capabilityId: string;
  method: string;
  mode: Mode;
  // TODO: Payload depends on the capability. For simplicity we can accept binary data, we could consider generics support.
  payload: {
    typeUrl: string;
    value: Uint8Array;
  };
};

export const doRequestAsync = ({
  capabilityId,
  method,
  mode,
  payload,
}: Params) => {
  const callbackId = getLastCallbackId(mode);
  incrementCallbackId(mode);

  const req: CapabilityRequest = create(CapabilityRequestSchema, {
    id: capabilityId,
    method,
    payload,
    callbackId,
  });

  const reqBytes = toBinary(CapabilityRequestSchema, req);

  callCapability(reqBytes);

  return callbackId;
};
