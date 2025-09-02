import { Mode } from "@cre/generated/sdk/v1alpha/sdk_pb";
import { Rand } from "@cre/sdk/utils/random";
import { enhancedRuntimeGuards } from "./enhanced-runtime-guards";

/**
 * Mode-aware random number generator that enforces mode safety
 * Similar to Go's implementation where random numbers can only be used
 * in the mode they were created in
 */
export class ModeAwareRand {
  private rand: Rand;
  private readonly createdInMode: Mode;

  constructor(seed: bigint, mode: Mode) {
    this.rand = new Rand(seed);
    this.createdInMode = mode;
  }

  /**
   * Assert that this random number generator can be used in the current mode
   * @throws Error if trying to use random number in wrong mode
   */
  private assertModeValid(): void {
    enhancedRuntimeGuards.assertRandomSafe(this.createdInMode);
  }

  /**
   * Generate a random 64-bit unsigned integer
   * @returns Random uint64 value
   * @throws Error if used in wrong mode
   */
  Uint64(): bigint {
    this.assertModeValid();
    return this.rand.Uint64();
  }

  /**
   * Generate a random 63-bit signed integer
   * @returns Random int63 value
   * @throws Error if used in wrong mode
   */
  Int63(): bigint {
    this.assertModeValid();
    return this.rand.Int63();
  }

  /**
   * Generate a random 32-bit unsigned integer
   * @returns Random uint32 value
   * @throws Error if used in wrong mode
   */
  Uint32(): number {
    this.assertModeValid();
    return this.rand.Uint32();
  }

  /**
   * Generate a random 31-bit signed integer
   * @returns Random int31 value
   * @throws Error if used in wrong mode
   */
  Int31(): number {
    this.assertModeValid();
    return this.rand.Int31();
  }

  /**
   * Generate a random number in the range [0, n)
   * @param n Upper bound (exclusive)
   * @returns Random number in range [0, n)
   * @throws Error if used in wrong mode
   */
  Intn(n: number): number {
    this.assertModeValid();
    return this.rand.Intn(n);
  }

  /**
   * Generate a random floating point number in [0.0, 1.0)
   * @returns Random float64 value
   * @throws Error if used in wrong mode
   */
  Float64(): number {
    this.assertModeValid();
    return this.rand.Float64();
  }

  /**
   * Generate a random floating point number in [0.0, 1.0)
   * @returns Random float32 value
   * @throws Error if used in wrong mode
   */
  Float32(): number {
    this.assertModeValid();
    return this.rand.Float32();
  }

  /**
   * Get the mode this random number generator was created in
   * @returns The creation mode
   */
  getCreatedMode(): Mode {
    return this.createdInMode;
  }

  /**
   * Check if this random number generator can be used in the current mode
   * @returns true if safe to use, false otherwise
   */
  isSafeToUse(): boolean {
    try {
      this.assertModeValid();
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Factory function to create mode-aware random number generators
 * @param seed Optional seed value. If not provided, uses host randomSeed
 * @param mode Optional mode. If not provided, uses current mode
 * @returns Mode-aware random number generator
 */
export const createModeAwareRand = (
  seed?: bigint,
  mode?: Mode
): ModeAwareRand => {
  const currentMode = mode || enhancedRuntimeGuards.getMode();

  // If no seed provided, get one from the host for the specified mode
  if (seed === undefined) {
    // Import host dynamically to avoid circular dependencies
    const { host } = require("@cre/sdk/utils/host");
    const hostSeed = host.randomSeed(currentMode);
    // Convert to integer and then to BigInt
    seed = BigInt(Math.floor(hostSeed));
  }

  return new ModeAwareRand(seed, currentMode);
};
