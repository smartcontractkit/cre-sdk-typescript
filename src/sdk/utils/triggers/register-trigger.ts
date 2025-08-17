import type { Trigger } from "./trigger-interface";
import type { Message } from "@bufbuild/protobuf";
import { create, toBinary } from "@bufbuild/protobuf";
import {
  TriggerSubscriptionRequestSchema,
  type TriggerSubscriptionRequest,
} from "@cre/generated/sdk/v1alpha/sdk_pb";

/**
 * Registers a trigger with the CRE runtime
 *
 * This function is called by the runtime to subscribe to trigger events.
 * The actual implementation would send this request to the host environment.
 *
 * @param trigger - The trigger to register
 * @returns A promise that resolves when the trigger is registered
 */
export async function registerTrigger<TOutput extends Message<string>, TAdapted = TOutput>(
  trigger: Trigger<TOutput, TAdapted>
): Promise<void> {
  // Create the subscription request
  const request = create(TriggerSubscriptionRequestSchema, {
    subscriptions: [
      {
        id: trigger.capabilityId(),
        method: trigger.method(),
        payload: trigger.configAsAny(),
      },
    ],
  });

  // TODO: Send this request to the host environment
  // For now, we'll just log it
  console.log("Registering trigger:", {
    capabilityId: trigger.capabilityId(),
    method: trigger.method(),
    payload: trigger.configAsAny(),
  });

  // In the real implementation, this would communicate with the host
  // through the WASM boundary or other runtime mechanism
  const requestBytes = toBinary(TriggerSubscriptionRequestSchema, request);

  // Placeholder for actual host communication
  // hostRegisterTrigger(requestBytes);
}
