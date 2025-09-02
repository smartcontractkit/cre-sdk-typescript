import { Mode } from "@cre/generated/sdk/v1alpha/sdk_pb";
import { host } from "./host";
import { enhancedRuntimeGuards } from "./enhanced-runtime-guards";
import { modeStateManager } from "./mode-state-manager";
import { ModeAwareRand, createModeAwareRand } from "./mode-aware-random";

/**
 * Enhanced host interface that provides mode-safe operations
 * This is a wrapper around the basic host that adds comprehensive mode safety
 */
export class EnhancedHost {
  /**
   * Switch execution modes with proper state management
   * @param mode The mode to switch to
   */
  switchModes(mode: Mode): void {
    modeStateManager.switchMode(mode);
  }

  /**
   * Log a message through the host
   * @param message Message to log
   */
  log(message: string): void {
    host.log(message);
  }

  /**
   * Send a response back to the host
   * @param payloadBase64 Base64-encoded payload
   * @returns Status code
   */
  sendResponse(payloadBase64: string): number {
    return host.sendResponse(payloadBase64);
  }

  /**
   * Get a mode-aware random number generator
   * The returned generator enforces mode safety and can only be used
   * in the mode it was created in
   * @param mode Optional mode (defaults to current mode)
   * @returns Mode-aware random number generator
   */
  getRand(mode?: Mode): ModeAwareRand {
    const targetMode = mode || enhancedRuntimeGuards.getMode();

    // Ensure the requested mode is safe
    enhancedRuntimeGuards.assertCapabilitySafe(targetMode);

    return createModeAwareRand(undefined, targetMode);
  }

  /**
   * Get a raw random seed from the host
   * This is a lower-level function - prefer getRand() for mode safety
   * @param mode Mode to get seed for
   * @returns Random seed value
   */
  getRandomSeed(mode: Mode.DON | Mode.NODE = Mode.DON): number {
    return host.randomSeed(mode);
  }

  /**
   * Get the current execution mode
   * @returns Current mode
   */
  getCurrentMode(): Mode {
    return enhancedRuntimeGuards.getMode();
  }

  /**
   * Check if currently in DON mode
   * @returns true if in DON mode
   */
  isDonMode(): boolean {
    return this.getCurrentMode() === Mode.DON;
  }

  /**
   * Check if currently in NODE mode
   * @returns true if in NODE mode
   */
  isNodeMode(): boolean {
    return this.getCurrentMode() === Mode.NODE;
  }

  /**
   * Execute a function with mode safety checks
   * @param mode Required mode for the operation
   * @param fn Function to execute
   * @returns Result of the function
   * @throws Error if not in the required mode
   */
  withModeCheck<T>(mode: Mode, fn: () => T): T {
    enhancedRuntimeGuards.assertCapabilitySafe(mode);
    return fn();
  }

  /**
   * Execute a function in DON mode (with safety check)
   * @param fn Function to execute
   * @returns Result of the function
   * @throws Error if not in DON mode
   */
  inDonMode<T>(fn: () => T): T {
    return this.withModeCheck(Mode.DON, fn);
  }

  /**
   * Execute a function in NODE mode (with safety check)
   * @param fn Function to execute
   * @returns Result of the function
   * @throws Error if not in NODE mode
   */
  inNodeMode<T>(fn: () => T): T {
    return this.withModeCheck(Mode.NODE, fn);
  }

  /**
   * Get debug information about current state
   * @returns Debug information
   */
  getDebugInfo(): {
    currentMode: Mode;
    stateManagerInfo: ReturnType<typeof modeStateManager.getDebugInfo>;
  } {
    return {
      currentMode: this.getCurrentMode(),
      stateManagerInfo: modeStateManager.getDebugInfo(),
    };
  }

  /**
   * Reset all enhanced state (useful for testing)
   */
  reset(): void {
    modeStateManager.reset();
  }
}

/**
 * Global enhanced host instance
 */
export const enhancedHost = new EnhancedHost();

/**
 * Legacy compatibility - re-export basic host for backward compatibility
 * @deprecated Use enhancedHost for better mode safety
 */
export { host as legacyHost };
