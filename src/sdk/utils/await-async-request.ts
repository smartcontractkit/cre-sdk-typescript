import {
  AwaitCapabilitiesRequestSchema,
  AwaitCapabilitiesResponseSchema,
  type CapabilityResponse,
} from "@cre/generated/sdk/v1alpha/sdk_pb";
import { create, toBinary, fromBinary } from "@bufbuild/protobuf";
import { CapabilityError } from "@cre/sdk/utils/capabilities/capability-error";
import { Mode } from "@cre/generated/sdk/v1alpha/sdk_pb";

type Params = {
  capabilityId: string;
  method: string;
  mode: Mode;
};

// Implementation signature (general fallback)
export async function awaitAsyncRequest(
  callbackId: number,
  { capabilityId, method, mode }: Params
): Promise<CapabilityResponse> {
  // Create proper AwaitCapabilitiesRequest protobuf message
  const awaitRequest = create(AwaitCapabilitiesRequestSchema, {
    ids: [callbackId],
  });

  // Encode to protobuf bytes
  const awaitRequestBytes = toBinary(
    AwaitCapabilitiesRequestSchema,
    awaitRequest
  );

  // Convert to base64 string for the host function
  const awaitRequestString = Buffer.from(awaitRequestBytes).toString("base64");
  const response = awaitCapabilities(awaitRequestString, 1024 * 1024);

  const bytes = Buffer.from(response, "base64");

  const awaitResponse = fromBinary(AwaitCapabilitiesResponseSchema, bytes);
  const capabilityResponse = awaitResponse.responses[callbackId];

  if (!capabilityResponse) {
    throw new CapabilityError(
      `No response found for callback ID ${callbackId}`,
      {
        capabilityId,
        method,
        mode,
        callbackId,
      }
    );
  }

  return capabilityResponse;
}
