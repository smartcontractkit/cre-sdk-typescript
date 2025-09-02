/**
 * Enhanced CRE SDK - Complete Mode Safety System
 *
 * This module provides comprehensive mode safety for the CRE SDK TypeScript
 * implementation, bringing it up to the same level of security and determinism
 * as the Go version.
 */

// Core enhanced functionality
export { enhancedCre as default, enhancedCre } from "@cre/sdk/cre/enhanced";
export {
  safeHandler,
  EnhancedRunner,
  createEnhancedRunner,
} from "@cre/sdk/cre/enhanced";

// Runtime types and factories
export type {
  RuntimeBase,
  DonRuntime,
  NodeRuntime,
} from "@cre/sdk/runtime/enhanced-runtime";
export {
  createDonRuntime,
  createNodeRuntime,
} from "@cre/sdk/runtime/enhanced-runtime";

// Mode-aware random number generation
export type { ModeAwareRand } from "@cre/sdk/utils/mode-aware-random";
export { createModeAwareRand } from "@cre/sdk/utils/mode-aware-random";

// Enhanced node mode execution
export {
  enhancedRunInNodeMode,
  typedRunInNodeMode,
  safeRunInNodeMode,
  createConsensusInputs,
  createErrorConsensusInputs,
} from "@cre/sdk/runtime/enhanced-run-in-node-mode";

// Runtime guards and state management
export { EnhancedRuntimeGuards } from "@cre/sdk/utils/enhanced-runtime-guards";
export { ModeStateManager } from "@cre/sdk/utils/mode-state-manager";
export { EnhancedHost } from "@cre/sdk/utils/enhanced-host";

// Enhanced capability calls
export {
  enhancedCallCapability,
  callDonCapability,
  callNodeCapability,
  batchCallCapabilities,
} from "@cre/sdk/utils/capabilities/enhanced-call-capability";

// Enhanced HTTP utilities
export {
  enhancedFetch,
  enhancedGet,
  enhancedPost,
  unsafeEnhancedFetch,
  batchEnhancedFetch,
} from "@cre/sdk/utils/capabilities/http/enhanced-fetch";

// Enhanced secrets management
export {
  EnhancedSecretManager,
  getEnhancedSecret,
  safeGetEnhancedSecret,
} from "@cre/sdk/utils/secrets/enhanced-get-secret";

// Migration utilities
export {
  compatRuntime,
  compatHost,
  compatRunInNodeMode,
  MigrationChecker,
  MigrationAssistant,
  configureMigration,
} from "@cre/sdk/migration/enhanced-migration";

// Global instances for convenience
export { enhancedRuntimeGuards } from "@cre/sdk/utils/enhanced-runtime-guards";
export { modeStateManager } from "@cre/sdk/utils/mode-state-manager";
export { enhancedHost } from "@cre/sdk/utils/enhanced-host";
export { enhancedSecretManager } from "@cre/sdk/utils/secrets/enhanced-get-secret";
export { migrationAssistant } from "@cre/sdk/migration/enhanced-migration";

// Re-export common types for convenience
export { Mode } from "@cre/generated/sdk/v1alpha/sdk_pb";

/**
 * Quick start example:
 *
 * ```typescript
 * import { enhancedCre, Mode } from "@cre/sdk/enhanced";
 *
 * // Get mode-safe random numbers
 * const rand = enhancedCre.getRand(Mode.DON);
 * const value = rand.Uint64();
 *
 * // Execute in node mode safely
 * await enhancedCre.runInNodeMode(async () => {
 *   const nodeRand = enhancedCre.getRand(Mode.NODE);
 *   return { observation: { value: nodeRand.Uint64() } };
 * });
 * ```
 */
