import { doRequestAsync } from "@cre/sdk/utils/do-request-async";
import { awaitAsyncRequest } from "@cre/sdk/utils/await-async-request";
import {
  Mode,
  type CapabilityResponse,
} from "@cre/generated/sdk/v1alpha/sdk_pb";
import { LazyPromise } from "@cre/sdk/utils/lazy-promise";
import { type CallCapabilityParams } from "@cre/sdk/utils/capabilities/call-capability";

/**
 * Dangerous call capability.
 * This function does not perform any runtime guard checks.
 * Use this function only in test code.
 *
 * @see callCapability implementation for actual proper usage.
 * */
export function dangerouslyCallCapability({
  capabilityId,
  method,
  mode = Mode.DON,
  payload,
}: CallCapabilityParams): Promise<CapabilityResponse> {
  const callbackId = doRequestAsync({
    capabilityId,
    method,
    mode,
    payload,
  });

  return new LazyPromise(async () => {
    return awaitAsyncRequest(callbackId, {
      capabilityId,
      method,
      mode,
    });
  });
}
