import {
  Mode,
  type CapabilityResponse,
} from "@cre/generated/sdk/v1alpha/sdk_pb";
import { LazyPromise } from "@cre/sdk/utils/lazy-promise";
import { enhancedRuntimeGuards } from "@cre/sdk/utils/enhanced-runtime-guards";
import { modeStateManager } from "@cre/sdk/utils/mode-state-manager";
import { doRequestAsync } from "@cre/sdk/utils/do-request-async";
import { awaitAsyncRequest } from "@cre/sdk/utils/await-async-request";

export type EnhancedCallCapabilityParams = {
  capabilityId: string;
  method: string;
  mode?: Mode; // Optional - defaults to current mode
  payload: {
    typeUrl: string;
    value: Uint8Array;
  };
};

/**
 * Enhanced capability call with comprehensive mode safety
 * This version provides better error messages, mode tracking, and state isolation
 *
 * @param params - The capability call parameters
 * @returns A promise that resolves to the capability response
 * @throws Error if mode violations are detected
 */
export function enhancedCallCapability({
  capabilityId,
  method,
  mode,
  payload,
}: EnhancedCallCapabilityParams): Promise<CapabilityResponse> {
  // Determine the target mode (default to current mode)
  const targetMode = mode || enhancedRuntimeGuards.getMode();
  const currentMode = enhancedRuntimeGuards.getMode();

  // Enhanced mode safety checks with better error messages
  if (targetMode === Mode.DON) {
    try {
      enhancedRuntimeGuards.assertDonSafe();
    } catch (error) {
      throw new Error(
        `Cannot call DON capability '${capabilityId}.${method}' while in NODE mode: ${
          (error as Error).message
        }`
      );
    }
  } else if (targetMode === Mode.NODE) {
    try {
      enhancedRuntimeGuards.assertNodeSafe();
    } catch (error) {
      throw new Error(
        `Cannot call NODE capability '${capabilityId}.${method}' while in DON mode: ${
          (error as Error).message
        }`
      );
    }
  }

  // Verify mode consistency
  if (targetMode !== currentMode) {
    throw new Error(
      `Mode mismatch for capability '${capabilityId}.${method}': ` +
        `requested ${Mode[targetMode]} but currently in ${Mode[currentMode]}`
    );
  }

  // Get mode-specific call ID
  const callbackId = modeStateManager.getNextCallId();

  // Enhanced logging for debugging
  const debugInfo = modeStateManager.getDebugInfo();
  console.log(
    `[Enhanced] Calling capability ${capabilityId}.${method} in ${Mode[targetMode]} mode with ID ${callbackId}`
  );
  console.log(`[Enhanced] State: ${JSON.stringify(debugInfo)}`);

  // Make the actual request with mode-specific ID
  const actualCallbackId = doRequestAsync({
    capabilityId,
    method,
    mode: targetMode,
    payload,
  });

  return new LazyPromise(async () => {
    try {
      const response = await awaitAsyncRequest(actualCallbackId, {
        capabilityId,
        method,
        mode: targetMode,
      });

      console.log(
        `[Enhanced] Capability ${capabilityId}.${method} completed successfully`
      );

      return response;
    } catch (error) {
      console.error(
        `[Enhanced] Capability ${capabilityId}.${method} failed:`,
        error
      );
      throw error;
    }
  });
}

/**
 * Mode-safe wrapper for DON-specific capability calls
 * @param params Capability parameters (mode will be forced to DON)
 * @returns Promise that resolves to capability response
 */
export function callDonCapability(
  params: Omit<EnhancedCallCapabilityParams, "mode">
): Promise<CapabilityResponse> {
  return enhancedCallCapability({ ...params, mode: Mode.DON });
}

/**
 * Mode-safe wrapper for NODE-specific capability calls
 * @param params Capability parameters (mode will be forced to NODE)
 * @returns Promise that resolves to capability response
 */
export function callNodeCapability(
  params: Omit<EnhancedCallCapabilityParams, "mode">
): Promise<CapabilityResponse> {
  return enhancedCallCapability({ ...params, mode: Mode.NODE });
}

/**
 * Batch capability calls with mode safety
 * All calls must be in the same mode
 * @param calls Array of capability calls
 * @param mode Mode for all calls
 * @returns Promise that resolves to array of responses
 */
export async function batchCallCapabilities(
  calls: Array<Omit<EnhancedCallCapabilityParams, "mode">>,
  mode: Mode
): Promise<CapabilityResponse[]> {
  // Ensure we're in the correct mode for batch calls
  enhancedRuntimeGuards.assertCapabilitySafe(mode);

  const promises = calls.map((call) =>
    enhancedCallCapability({ ...call, mode })
  );

  return Promise.all(promises);
}
