import {
  Mode,
  type SimpleConsensusInputsJson,
} from "@cre/generated/sdk/v1alpha/sdk_pb";
import type { Value } from "@cre/generated/values/v1/values_pb";
import { enhancedHost } from "@cre/sdk/utils/enhanced-host";
import { enhancedRuntimeGuards } from "@cre/sdk/utils/enhanced-runtime-guards";

/**
 * Type for consensus inputs that can be provided to runInNodeMode
 */
export type ConsensusInputs =
  | SimpleConsensusInputsJson
  | {
      observation?: any;
      descriptors?: any;
      default?: any;
    };

/**
 * Convert consensus inputs to the expected JSON format
 * @param inputs Consensus inputs
 * @returns JSON formatted inputs
 */
const toInputsJson = (inputs: ConsensusInputs): SimpleConsensusInputsJson => {
  // If already in correct format, return as-is
  if ("observation" in inputs && "descriptors" in inputs) {
    return inputs as SimpleConsensusInputsJson;
  }

  // Convert to expected format
  return inputs as SimpleConsensusInputsJson;
};

/**
 * Enhanced version of runInNodeMode with comprehensive mode safety
 *
 * This function:
 * 1. Ensures we're currently in DON mode before starting
 * 2. Switches to NODE mode for the execution
 * 3. Provides mode-safe runtime to the callback
 * 4. Always restores DON mode, even if errors occur
 * 5. Performs consensus on the result
 *
 * @param buildConsensusInputs Function that builds consensus inputs in NODE mode
 * @returns Promise that resolves to consensus result
 * @throws Error if called outside DON mode or if mode violations occur
 */
export const enhancedRunInNodeMode = async <T = Value>(
  buildConsensusInputs: () => Promise<ConsensusInputs> | ConsensusInputs
): Promise<T> => {
  // Ensure we're starting in DON mode
  enhancedRuntimeGuards.assertDonSafe();

  // Store the current mode to restore later
  const previousMode = enhancedHost.getCurrentMode();

  let consensusInputJson: SimpleConsensusInputsJson;

  try {
    // Switch to NODE mode with proper state management
    enhancedHost.switchModes(Mode.NODE);

    // Execute the consensus input builder in NODE mode
    const consensusInput = await buildConsensusInputs();
    consensusInputJson = toInputsJson(consensusInput);
  } catch (error) {
    // If there's an error in NODE mode, we still need to restore DON mode
    enhancedHost.switchModes(previousMode);
    throw error;
  } finally {
    // Always restore the previous mode (should be DON)
    enhancedHost.switchModes(previousMode);
  }

  // Now we're back in DON mode - perform consensus
  enhancedRuntimeGuards.assertDonSafe();

  const { ConsensusCapability } = await import(
    "@cre/generated-sdk/capabilities/internal/consensus/v1alpha/consensus_sdk_gen"
  );
  const consensus = new ConsensusCapability();
  const result = await consensus.simple(consensusInputJson);

  return result as T;
};

/**
 * Type-safe wrapper for runInNodeMode that ensures proper typing
 * @param buildConsensusInputs Function that builds consensus inputs
 * @returns Promise that resolves to typed consensus result
 */
export const typedRunInNodeMode = async <T>(
  buildConsensusInputs: () => Promise<ConsensusInputs> | ConsensusInputs
): Promise<T> => {
  return enhancedRunInNodeMode<T>(buildConsensusInputs);
};

/**
 * Utility function to create consensus inputs with proper error handling
 * @param observation The observation value
 * @param descriptors Consensus descriptors
 * @param defaultValue Default value for consensus
 * @returns Consensus inputs object
 */
export const createConsensusInputs = (
  observation: any,
  descriptors?: any,
  defaultValue?: any
): ConsensusInputs => {
  return {
    observation,
    descriptors,
    default: defaultValue,
  };
};

/**
 * Utility function to create error consensus inputs
 * @param error Error that occurred
 * @returns Consensus inputs with error
 */
export const createErrorConsensusInputs = (
  error: Error | string
): ConsensusInputs => {
  const errorMessage = typeof error === "string" ? error : error.message;

  return {
    observation: {
      error: errorMessage,
    },
  };
};

/**
 * Safe wrapper that catches errors and converts them to consensus inputs
 * @param buildConsensusInputs Function that builds consensus inputs
 * @returns Promise that resolves to consensus result (never throws)
 */
export const safeRunInNodeMode = async <T = Value>(
  buildConsensusInputs: () => Promise<ConsensusInputs> | ConsensusInputs
): Promise<T> => {
  try {
    return await enhancedRunInNodeMode<T>(buildConsensusInputs);
  } catch (error) {
    // Convert error to consensus inputs and try again
    const errorInputs = createErrorConsensusInputs(error as Error);
    return await enhancedRunInNodeMode<T>(() => errorInputs);
  }
};
