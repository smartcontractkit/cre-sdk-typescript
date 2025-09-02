import { Mode } from "@cre/generated/sdk/v1alpha/sdk_pb";
import type { Secret } from "@cre/generated/sdk/v1alpha/sdk_pb";
import { ModeAwareRand, createModeAwareRand } from "./mode-aware-random";
import { enhancedRuntimeGuards } from "./enhanced-runtime-guards";
import { host } from "./host";

/**
 * State container for DON mode operations
 */
interface DonState {
  callId: number;
  randomSource?: ModeAwareRand;
  secrets: Map<string, Secret>;
}

/**
 * State container for NODE mode operations
 */
interface NodeState {
  callId: number;
  randomSource?: ModeAwareRand;
}

/**
 * Manages mode-specific state isolation similar to Go's implementation
 * Each mode maintains its own call IDs, random sources, and other state
 */
export class ModeStateManager {
  private donState: DonState = {
    callId: 0,
    secrets: new Map(),
  };

  private nodeState: NodeState = {
    callId: 0,
  };

  /**
   * Switch to the specified mode and update state isolation
   * @param mode The mode to switch to
   */
  switchMode(mode: Mode): void {
    // Update host and guards
    host.switchModes(mode);
    enhancedRuntimeGuards.setMode(mode);

    // Clear cross-mode state to prevent contamination
    if (mode === Mode.NODE) {
      // Entering node mode - clear DON random source
      this.donState.randomSource = undefined;
    } else if (mode === Mode.DON) {
      // Entering DON mode - clear NODE random source
      this.nodeState.randomSource = undefined;
    }
  }

  /**
   * Get the current mode
   * @returns Current execution mode
   */
  getCurrentMode(): Mode {
    return enhancedRuntimeGuards.getMode();
  }

  /**
   * Get the next call ID for the current mode
   * DON mode uses positive incrementing IDs (1, 2, 3, ...)
   * NODE mode uses negative decrementing IDs (-1, -2, -3, ...)
   * @returns Next call ID for current mode
   */
  getNextCallId(): number {
    const currentMode = this.getCurrentMode();

    if (currentMode === Mode.DON) {
      return ++this.donState.callId;
    } else if (currentMode === Mode.NODE) {
      return --this.nodeState.callId; // Negative IDs like Go
    } else {
      throw new Error(
        `Invalid mode for call ID generation: ${Mode[currentMode]}`
      );
    }
  }

  /**
   * Get the current call ID for the specified mode without incrementing
   * @param mode The mode to get call ID for
   * @returns Current call ID for the mode
   */
  getCurrentCallId(mode: Mode): number {
    if (mode === Mode.DON) {
      return this.donState.callId;
    } else if (mode === Mode.NODE) {
      return this.nodeState.callId;
    } else {
      throw new Error(`Invalid mode for call ID retrieval: ${Mode[mode]}`);
    }
  }

  /**
   * Get or create a mode-aware random number generator for the current mode
   * @returns Mode-aware random number generator
   */
  getRandom(): ModeAwareRand {
    const currentMode = this.getCurrentMode();

    if (currentMode === Mode.DON) {
      if (!this.donState.randomSource) {
        this.donState.randomSource = createModeAwareRand(undefined, Mode.DON);
      }
      return this.donState.randomSource;
    } else if (currentMode === Mode.NODE) {
      if (!this.nodeState.randomSource) {
        this.nodeState.randomSource = createModeAwareRand(undefined, Mode.NODE);
      }
      return this.nodeState.randomSource;
    } else {
      throw new Error(
        `Invalid mode for random generation: ${Mode[currentMode]}`
      );
    }
  }

  /**
   * Store a secret in DON mode state
   * @param id Secret identifier
   * @param secret Secret value
   * @throws Error if not in DON mode
   */
  storeSecret(id: string, secret: Secret): void {
    enhancedRuntimeGuards.assertSecretSafe();
    this.donState.secrets.set(id, secret);
  }

  /**
   * Retrieve a secret from DON mode state
   * @param id Secret identifier
   * @returns Secret value or undefined if not found
   * @throws Error if not in DON mode
   */
  getStoredSecret(id: string): Secret | undefined {
    enhancedRuntimeGuards.assertSecretSafe();
    return this.donState.secrets.get(id);
  }

  /**
   * Clear all secrets from DON mode state
   * @throws Error if not in DON mode
   */
  clearSecrets(): void {
    enhancedRuntimeGuards.assertSecretSafe();
    this.donState.secrets.clear();
  }

  /**
   * Get debug information about current state
   * @returns State information for debugging
   */
  getDebugInfo(): {
    currentMode: Mode;
    donCallId: number;
    nodeCallId: number;
    donHasRandom: boolean;
    nodeHasRandom: boolean;
    secretCount: number;
  } {
    return {
      currentMode: this.getCurrentMode(),
      donCallId: this.donState.callId,
      nodeCallId: this.nodeState.callId,
      donHasRandom: !!this.donState.randomSource,
      nodeHasRandom: !!this.nodeState.randomSource,
      secretCount: this.donState.secrets.size,
    };
  }

  /**
   * Reset all state (useful for testing)
   */
  reset(): void {
    this.donState = {
      callId: 0,
      secrets: new Map(),
    };

    this.nodeState = {
      callId: 0,
    };

    enhancedRuntimeGuards.setMode(Mode.DON);
  }
}

// Global instance for ease of use
export const modeStateManager = new ModeStateManager();
