import { describe, it, expect, beforeEach } from "bun:test";
import { Mode } from "@cre/generated/sdk/v1alpha/sdk_pb";
import { ModeAwareRand } from "./mode-aware-random";
import { enhancedRuntimeGuards } from "./enhanced-runtime-guards";

describe("ModeAwareRand", () => {
  beforeEach(() => {
    // Reset runtime guards to DON mode
    enhancedRuntimeGuards.setMode(Mode.DON);
  });

  describe("Construction", () => {
    it("should create with specific seed and mode", () => {
      const rand = new ModeAwareRand(123n, Mode.DON);
      expect(rand.getCreatedMode()).toBe(Mode.DON);
    });

    it("should track creation mode", () => {
      const donRand = new ModeAwareRand(123n, Mode.DON);
      const nodeRand = new ModeAwareRand(456n, Mode.NODE);

      expect(donRand.getCreatedMode()).toBe(Mode.DON);
      expect(nodeRand.getCreatedMode()).toBe(Mode.NODE);
    });
  });

  describe("Mode Safety", () => {
    it("should allow usage in same mode as creation", () => {
      enhancedRuntimeGuards.setMode(Mode.DON);
      const rand = new ModeAwareRand(123n, Mode.DON);

      expect(() => rand.Uint64()).not.toThrow();
      expect(() => rand.Int63()).not.toThrow();
      expect(() => rand.Uint32()).not.toThrow();
      expect(() => rand.Int31()).not.toThrow();
      expect(() => rand.Intn(100)).not.toThrow();
      expect(() => rand.Float64()).not.toThrow();
      expect(() => rand.Float32()).not.toThrow();
    });

    it("should block usage in different mode", () => {
      enhancedRuntimeGuards.setMode(Mode.DON);
      const rand = new ModeAwareRand(123n, Mode.NODE); // Created for NODE mode

      expect(() => rand.Uint64()).toThrow(
        "random cannot be used outside the mode it was created in"
      );
      expect(() => rand.Int63()).toThrow();
      expect(() => rand.Uint32()).toThrow();
      expect(() => rand.Int31()).toThrow();
      expect(() => rand.Intn(100)).toThrow();
      expect(() => rand.Float64()).toThrow();
      expect(() => rand.Float32()).toThrow();
    });

    it("should work correctly after mode switching", () => {
      // Create random in DON mode
      enhancedRuntimeGuards.setMode(Mode.DON);
      const donRand = new ModeAwareRand(123n, Mode.DON);
      expect(() => donRand.Uint64()).not.toThrow();

      // Switch to NODE mode - DON random should fail
      enhancedRuntimeGuards.setMode(Mode.NODE);
      expect(() => donRand.Uint64()).toThrow();

      // Create NODE random - should work in NODE mode
      const nodeRand = new ModeAwareRand(456n, Mode.NODE);
      expect(() => nodeRand.Uint64()).not.toThrow();

      // Switch back to DON mode - NODE random should fail, DON should work
      enhancedRuntimeGuards.setMode(Mode.DON);
      expect(() => nodeRand.Uint64()).toThrow();
      expect(() => donRand.Uint64()).not.toThrow();
    });
  });

  describe("Safety Checking", () => {
    it("should correctly report safety status", () => {
      enhancedRuntimeGuards.setMode(Mode.DON);
      const donRand = new ModeAwareRand(123n, Mode.DON);
      const nodeRand = new ModeAwareRand(456n, Mode.NODE);

      expect(donRand.isSafeToUse()).toBe(true);
      expect(nodeRand.isSafeToUse()).toBe(false);

      // Switch modes
      enhancedRuntimeGuards.setMode(Mode.NODE);
      expect(donRand.isSafeToUse()).toBe(false);
      expect(nodeRand.isSafeToUse()).toBe(true);
    });
  });

  describe("Random Number Generation", () => {
    it("should generate consistent numbers with same seed", () => {
      enhancedRuntimeGuards.setMode(Mode.DON);
      const rand1 = new ModeAwareRand(42n, Mode.DON);
      const rand2 = new ModeAwareRand(42n, Mode.DON);

      // Same seed should produce same sequence
      expect(rand1.Uint64()).toBe(rand2.Uint64());
      expect(rand1.Int63()).toBe(rand2.Int63());
      expect(rand1.Float64()).toBe(rand2.Float64());
    });

    it("should generate different numbers with different seeds", () => {
      enhancedRuntimeGuards.setMode(Mode.DON);
      const rand1 = new ModeAwareRand(42n, Mode.DON);
      const rand2 = new ModeAwareRand(123n, Mode.DON);

      // Different seeds should produce different sequences
      expect(rand1.Uint64()).not.toBe(rand2.Uint64());
    });

    it("should respect bounds for Intn", () => {
      enhancedRuntimeGuards.setMode(Mode.DON);
      const rand = new ModeAwareRand(42n, Mode.DON);

      for (let i = 0; i < 10; i++) {
        const value = rand.Intn(100);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(100);
      }
    });

    it("should generate valid float values", () => {
      enhancedRuntimeGuards.setMode(Mode.DON);
      const rand = new ModeAwareRand(42n, Mode.DON);

      for (let i = 0; i < 10; i++) {
        const float64 = rand.Float64();
        expect(float64).toBeGreaterThanOrEqual(0);
        expect(float64).toBeLessThan(1);

        const float32 = rand.Float32();
        expect(float32).toBeGreaterThanOrEqual(0);
        expect(float32).toBeLessThan(1);
      }
    });
  });

  describe("Cross-Mode Contamination Prevention", () => {
    it("should prevent DON random usage in NODE mode", () => {
      enhancedRuntimeGuards.setMode(Mode.DON);
      const donRand = new ModeAwareRand(42n, Mode.DON);

      enhancedRuntimeGuards.setMode(Mode.NODE);
      expect(() => donRand.Uint64()).toThrow(
        "random cannot be used outside the mode it was created in"
      );
    });

    it("should prevent NODE random usage in DON mode", () => {
      enhancedRuntimeGuards.setMode(Mode.NODE);
      const nodeRand = new ModeAwareRand(42n, Mode.NODE);

      enhancedRuntimeGuards.setMode(Mode.DON);
      expect(() => nodeRand.Uint64()).toThrow(
        "random cannot be used outside the mode it was created in"
      );
    });

    it("should allow multiple randoms in same mode", () => {
      enhancedRuntimeGuards.setMode(Mode.DON);
      const rand1 = new ModeAwareRand(42n, Mode.DON);
      const rand2 = new ModeAwareRand(123n, Mode.DON);

      expect(() => rand1.Uint64()).not.toThrow();
      expect(() => rand2.Uint64()).not.toThrow();
    });
  });
});
