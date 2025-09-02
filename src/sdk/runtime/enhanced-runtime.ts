import { Mode } from "@cre/generated/sdk/v1alpha/sdk_pb";
import type { Secret, SecretRequest } from "@cre/generated/sdk/v1alpha/sdk_pb";
import type { Logger } from "@cre/sdk/logger";
import { ModeAwareRand } from "@cre/sdk/utils/mode-aware-random";
import { modeStateManager } from "@cre/sdk/utils/mode-state-manager";
import { enhancedRuntimeGuards } from "@cre/sdk/utils/enhanced-runtime-guards";

/**
 * Base interface for all runtime types
 * Provides common functionality available in all modes
 */
export interface RuntimeBase {
  readonly mode: Mode;
  readonly logger: Logger;

  /**
   * Get a mode-aware random number generator
   * The returned generator can only be used in the mode it was created in
   * @returns Mode-aware random number generator
   */
  getRand(): ModeAwareRand;

  /**
   * Get the current time
   * @returns Current timestamp
   */
  now(): Date;

  /**
   * Get the current call ID for this runtime's mode
   * @returns Current call ID
   */
  getCallId(): number;
}

/**
 * DON (Distributed Oracle Network) runtime interface
 * Provides access to DON-specific operations like secrets and node mode execution
 */
export interface DonRuntime extends RuntimeBase {
  readonly mode: Mode.DON;

  /**
   * Execute a function in Node mode and return the consensus result
   * @param fn Function to execute in Node mode
   * @returns Promise that resolves to consensus result
   */
  runInNodeMode<T>(
    fn: (nodeRuntime: NodeRuntime) => Promise<T> | T
  ): Promise<T>;

  /**
   * Get a secret by ID
   * @param request Secret request
   * @returns Promise that resolves to secret
   */
  getSecret(request: SecretRequest): Promise<Secret>;

  /**
   * Check if this is a DON runtime (type guard)
   * @returns true (always for DonRuntime)
   */
  isDonRuntime(): true;
}

/**
 * Node runtime interface
 * Provides access to Node-specific operations
 * Can only be used within runInNodeMode context
 */
export interface NodeRuntime extends RuntimeBase {
  readonly mode: Mode.NODE;

  /**
   * Check if this is a node runtime (type guard)
   * @returns true (always for NodeRuntime)
   */
  isNodeRuntime(): true;
}

/**
 * Implementation of the base runtime functionality
 */
abstract class BaseRuntimeImpl implements RuntimeBase {
  constructor(public readonly mode: Mode, public readonly logger: Logger) {}

  getRand(): ModeAwareRand {
    // Ensure we're in the correct mode
    if (enhancedRuntimeGuards.getMode() !== this.mode) {
      throw new Error(
        `Runtime mode mismatch: expected ${Mode[this.mode]}, got ${
          Mode[enhancedRuntimeGuards.getMode()]
        }`
      );
    }

    return modeStateManager.getRandom();
  }

  now(): Date {
    return new Date();
  }

  getCallId(): number {
    return modeStateManager.getCurrentCallId(this.mode);
  }
}

/**
 * Implementation of DON runtime
 */
export class DonRuntimeImpl extends BaseRuntimeImpl implements DonRuntime {
  readonly mode = Mode.DON as const;

  constructor(logger: Logger) {
    super(Mode.DON, logger);
  }

  async runInNodeMode<T>(
    fn: (nodeRuntime: NodeRuntime) => Promise<T> | T
  ): Promise<T> {
    // Ensure we're currently in DON mode
    enhancedRuntimeGuards.assertDonSafe();

    // Switch to node mode
    const previousMode = modeStateManager.getCurrentMode();
    modeStateManager.switchMode(Mode.NODE);

    try {
      // Create node runtime
      const nodeRuntime = new NodeRuntimeImpl(this.logger);

      // Execute the function
      const result = await fn(nodeRuntime);

      return result;
    } finally {
      // Always restore previous mode
      modeStateManager.switchMode(previousMode);
    }
  }

  async getSecret(request: SecretRequest): Promise<Secret> {
    // Ensure we're in DON mode and secrets are safe to access
    enhancedRuntimeGuards.assertSecretSafe();

    // Check if we have it cached
    const cached = modeStateManager.getStoredSecret(request.id);
    if (cached) {
      return cached;
    }

    // Use the enhanced secret manager to get the secret from host
    const { enhancedSecretManager } = await import(
      "@cre/sdk/utils/secrets/enhanced-get-secret"
    );
    return enhancedSecretManager.getSecret(request);
  }

  isDonRuntime(): true {
    return true;
  }
}

/**
 * Implementation of Node runtime
 */
export class NodeRuntimeImpl extends BaseRuntimeImpl implements NodeRuntime {
  readonly mode = Mode.NODE as const;

  constructor(logger: Logger) {
    super(Mode.NODE, logger);
  }

  isNodeRuntime(): true {
    return true;
  }
}

/**
 * Factory function to create a DON runtime
 * @param logger Logger instance
 * @returns DON runtime implementation
 */
export const createDonRuntime = (logger: Logger): DonRuntime => {
  return new DonRuntimeImpl(logger);
};

/**
 * Factory function to create a Node runtime (internal use only)
 * Node runtimes should only be created within runInNodeMode context
 * @param logger Logger instance
 * @returns Node runtime implementation
 */
export const createNodeRuntime = (logger: Logger): NodeRuntime => {
  return new NodeRuntimeImpl(logger);
};
