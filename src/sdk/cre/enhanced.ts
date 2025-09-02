/**
 * Enhanced CRE SDK with comprehensive mode safety
 *
 * This module provides improved versions of the core CRE SDK functionality
 * with proper mode isolation, state management, and runtime protection.
 */

import { prepareRuntime } from "@cre/sdk/utils/prepare-runtime";
import { handler, Runner } from "@cre/sdk/workflow";
import { configHandler } from "@cre/sdk/utils/config";
import { logger } from "@cre/sdk/logger";

// Enhanced imports
import {
  enhancedRunInNodeMode,
  typedRunInNodeMode,
  safeRunInNodeMode,
} from "@cre/sdk/runtime/enhanced-run-in-node-mode";
import {
  createDonRuntime,
  type DonRuntime,
  type NodeRuntime,
} from "@cre/sdk/runtime/enhanced-runtime";
import { enhancedHost } from "@cre/sdk/utils/enhanced-host";
import { modeStateManager } from "@cre/sdk/utils/mode-state-manager";
import { enhancedRuntimeGuards } from "@cre/sdk/utils/enhanced-runtime-guards";
import {
  createModeAwareRand,
  ModeAwareRand,
} from "@cre/sdk/utils/mode-aware-random";

// Re-exports for convenience
import { CronCapability } from "@cre/generated-sdk/capabilities/scheduler/cron/v1/cron_sdk_gen";
import { ClientCapability as EVMClient } from "@cre/generated-sdk/capabilities/blockchain/evm/v1alpha/client_sdk_gen";
import { ClientCapability as HTTPClient } from "@cre/generated-sdk/capabilities/networking/http/v1alpha/client_sdk_gen";
import { val } from "@cre/sdk/utils/values/value";
import { getAggregatedValue } from "@cre/sdk/utils/values/consensus";
import { creFetch } from "@cre/sdk/utils/capabilities/http/fetch";
import {
  enhancedFetch,
  enhancedGet,
  enhancedPost,
} from "@cre/sdk/utils/capabilities/http/enhanced-fetch";
import { sendResponseValue } from "@cre/sdk/utils/send-response-value";
import { Mode } from "@cre/generated/sdk/v1alpha/sdk_pb";

// Initialize enhanced runtime
prepareRuntime();
if (typeof versionV2 === "function") {
  versionV2();
}

/**
 * Enhanced CRE SDK with mode safety and proper state isolation
 */
export const enhancedCre = {
  // Core runtime management
  createDonRuntime: () => createDonRuntime(logger),
  getCurrentMode: () => enhancedHost.getCurrentMode(),
  switchModes: (mode: Mode) => enhancedHost.switchModes(mode),

  // Mode-safe random number generation
  getRand: (mode?: Mode) => enhancedHost.getRand(mode),
  createRand: (seed?: bigint, mode?: Mode) => createModeAwareRand(seed, mode),

  // Enhanced node mode execution
  runInNodeMode: enhancedRunInNodeMode,
  typedRunInNodeMode,
  safeRunInNodeMode,

  // State management
  getStateDebugInfo: () => modeStateManager.getDebugInfo(),
  resetState: () => modeStateManager.reset(),

  // Mode checking utilities
  isDonMode: () => enhancedHost.isDonMode(),
  isNodeMode: () => enhancedHost.isNodeMode(),
  withModeCheck: <T>(mode: Mode, fn: () => T) =>
    enhancedHost.withModeCheck(mode, fn),
  inDonMode: <T>(fn: () => T) => enhancedHost.inDonMode(fn),
  inNodeMode: <T>(fn: () => T) => enhancedHost.inNodeMode(fn),

  // Legacy compatibility (re-exported from original)
  handler,
  Runner,
  configHandler,

  // Capabilities (re-exported)
  CronCapability,
  EVMClient,
  HTTPClient,
  creFetch, // Legacy fetch (unsafe)

  // Enhanced HTTP utilities
  enhancedFetch,
  enhancedGet,
  enhancedPost,

  // Values and utilities
  val,
  getAggregatedValue,
  sendResponseValue,

  // Host operations
  log: (message: string) => enhancedHost.log(message),
  sendResponse: (payload: string) => enhancedHost.sendResponse(payload),
} as const;

/**
 * Type definitions for enhanced CRE
 */
export type { DonRuntime, NodeRuntime, ModeAwareRand };

/**
 * Enhanced workflow handler with mode safety
 * This is a drop-in replacement for the original handler with added safety
 */
export const safeHandler = <TConfig, TTriggerOutput, THandlerOutput>(
  trigger: any,
  fn: (
    config: TConfig,
    runtime: DonRuntime,
    triggerOutput: TTriggerOutput
  ) => Promise<THandlerOutput> | THandlerOutput
) => {
  return {
    trigger,
    fn: async (
      config: TConfig,
      runtime: any,
      triggerOutput: TTriggerOutput
    ) => {
      // Ensure we're in DON mode before executing handler
      enhancedRuntimeGuards.assertDonSafe();

      // Create enhanced DON runtime
      const donRuntime = createDonRuntime(logger);

      // Execute with mode safety
      return await fn(config, donRuntime, triggerOutput);
    },
  };
};

/**
 * Enhanced Runner with mode safety using composition
 */
export class EnhancedRunner<TConfig> {
  private runner: Runner<TConfig>;

  constructor(runner: Runner<TConfig>) {
    this.runner = runner;
  }

  /**
   * Run workflow with enhanced mode safety
   */
  async runSafe(initFn: (config: TConfig) => Promise<any> | any): Promise<any> {
    // Ensure we start in DON mode
    enhancedHost.switchModes(Mode.DON);

    try {
      return await this.runner.run(initFn);
    } catch (error) {
      // Log mode information for debugging
      const debugInfo = enhancedHost.getDebugInfo();
      enhancedHost.log(
        `Enhanced runner error in mode ${Mode[debugInfo.currentMode]}: ${error}`
      );
      throw error;
    }
  }

  /**
   * Delegate to the underlying runner's run method
   */
  async run(initFn: (config: TConfig) => Promise<any> | any): Promise<any> {
    return this.runner.run(initFn);
  }
}

/**
 * Factory to create enhanced runner
 */
export const createEnhancedRunner = async <T>(
  configHandlerParams: any = {}
): Promise<EnhancedRunner<T>> => {
  const runner = await Runner.newRunner<T>(configHandlerParams);
  return new EnhancedRunner(runner);
};

/**
 * Default export for enhanced CRE SDK
 */
export default enhancedCre;
