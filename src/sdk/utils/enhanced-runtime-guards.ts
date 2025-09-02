import { Mode } from "@cre/generated/sdk/v1alpha/sdk_pb";

/**
 * Enhanced runtime guards that provide comprehensive mode safety
 * This is an improved version of the basic runtime guards with additional protections
 */
export class EnhancedRuntimeGuards {
  private currentMode: Mode = Mode.DON;
  private donModeGuardError: Error | null = null;
  private nodeModeGuardError: Error | null = null;

  constructor() {
    this.setMode(Mode.DON); // Initialize in DON mode
  }

  setMode(mode: Mode): void {
    this.currentMode = mode;

    if (mode === Mode.NODE) {
      // In node mode, forbid DON runtime calls
      this.donModeGuardError = new Error(
        "cannot use Runtime inside RunInNodeMode"
      );
      this.nodeModeGuardError = null;
    } else if (mode === Mode.DON) {
      // Back in DON mode, forbid node runtime calls
      this.nodeModeGuardError = new Error(
        "cannot use NodeRuntime outside RunInNodeMode"
      );
      this.donModeGuardError = null;
    } else {
      // Clear all errors for other modes
      this.donModeGuardError = null;
      this.nodeModeGuardError = null;
    }
  }

  getMode(): Mode {
    return this.currentMode;
  }

  /**
   * Assert that DON mode operations are safe to perform
   * @throws Error if currently in NODE mode and trying to use DON operations
   */
  assertDonSafe(): void {
    if (this.donModeGuardError) {
      throw this.donModeGuardError;
    }
  }

  /**
   * Assert that NODE mode operations are safe to perform
   * @throws Error if currently in DON mode and trying to use NODE operations
   */
  assertNodeSafe(): void {
    if (this.nodeModeGuardError) {
      throw this.nodeModeGuardError;
    }
  }

  /**
   * Assert that random numbers created in a specific mode can be used
   * @param createdInMode The mode the random number was created in
   * @throws Error if trying to use random number in wrong mode
   */
  assertRandomSafe(createdInMode: Mode): void {
    if (this.currentMode !== createdInMode) {
      throw new Error(
        `random cannot be used outside the mode it was created in. ` +
          `Created in ${Mode[createdInMode]}, currently in ${
            Mode[this.currentMode]
          }`
      );
    }
  }

  /**
   * Assert that secrets operations are safe to perform
   * Secrets can only be accessed in DON mode
   * @throws Error if trying to access secrets outside DON mode
   */
  assertSecretSafe(): void {
    if (this.currentMode !== Mode.DON) {
      throw new Error("secrets can only be accessed in DON mode");
    }
  }

  /**
   * Assert that capability calls are safe for the specified mode
   * @param mode The mode the capability is being called in
   * @throws Error if mode violation detected
   */
  assertCapabilitySafe(mode: Mode): void {
    if (mode === Mode.DON) {
      this.assertDonSafe();
    } else if (mode === Mode.NODE) {
      this.assertNodeSafe();
    }
  }
}

// Global instance for backward compatibility and ease of use
export const enhancedRuntimeGuards = new EnhancedRuntimeGuards();
