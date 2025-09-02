import { describe, it, expect, beforeEach } from "bun:test";
import { Mode } from "@cre/generated/sdk/v1alpha/sdk_pb";
import { modeStateManager } from "./mode-state-manager";
import { enhancedRuntimeGuards } from "./enhanced-runtime-guards";

describe("ModeStateManager", () => {
  beforeEach(() => {
    modeStateManager.reset(); // Ensure clean state
    enhancedRuntimeGuards.setMode(Mode.DON);
  });

  describe("Call ID Management", () => {
    it("should increment call IDs in DON mode", () => {
      enhancedRuntimeGuards.setMode(Mode.DON);

      expect(modeStateManager.getNextCallId()).toBe(1);
      expect(modeStateManager.getNextCallId()).toBe(2);
      expect(modeStateManager.getNextCallId()).toBe(3);
    });

    it("should decrement call IDs in NODE mode", () => {
      enhancedRuntimeGuards.setMode(Mode.NODE);

      expect(modeStateManager.getNextCallId()).toBe(-1);
      expect(modeStateManager.getNextCallId()).toBe(-2);
      expect(modeStateManager.getNextCallId()).toBe(-3);
    });

    it("should maintain separate call ID counters for each mode", () => {
      // DON mode calls
      enhancedRuntimeGuards.setMode(Mode.DON);
      expect(modeStateManager.getNextCallId()).toBe(1);
      expect(modeStateManager.getNextCallId()).toBe(2);

      // NODE mode calls
      enhancedRuntimeGuards.setMode(Mode.NODE);
      expect(modeStateManager.getNextCallId()).toBe(-1);
      expect(modeStateManager.getNextCallId()).toBe(-2);

      // Back to DON mode - should continue from where it left off
      enhancedRuntimeGuards.setMode(Mode.DON);
      expect(modeStateManager.getNextCallId()).toBe(3);
    });

    it("should get current call ID without incrementing", () => {
      enhancedRuntimeGuards.setMode(Mode.DON);

      // Make some calls to increment
      modeStateManager.getNextCallId();
      modeStateManager.getNextCallId();

      // Current should return the last value without incrementing
      expect(modeStateManager.getCurrentCallId(Mode.DON)).toBe(2);
      expect(modeStateManager.getCurrentCallId(Mode.DON)).toBe(2); // Should be same
    });

    it("should throw error for invalid mode in call ID operations", () => {
      expect(() => modeStateManager.getCurrentCallId(Mode.UNSPECIFIED)).toThrow(
        "Invalid mode for call ID retrieval"
      );

      enhancedRuntimeGuards.setMode(Mode.UNSPECIFIED);
      expect(() => modeStateManager.getNextCallId()).toThrow(
        "Invalid mode for call ID generation"
      );
    });
  });

  describe("Random Number Management", () => {
    it("should create and cache random generators per mode", () => {
      enhancedRuntimeGuards.setMode(Mode.DON);
      const rand1 = modeStateManager.getRandom();
      const rand2 = modeStateManager.getRandom();

      // Should return the same instance (cached)
      expect(rand1).toBe(rand2);
      expect(rand1.getCreatedMode()).toBe(Mode.DON);
    });

    it("should create separate random generators for different modes", () => {
      enhancedRuntimeGuards.setMode(Mode.DON);
      const donRand = modeStateManager.getRandom();

      enhancedRuntimeGuards.setMode(Mode.NODE);
      const nodeRand = modeStateManager.getRandom();

      expect(donRand).not.toBe(nodeRand);
      expect(donRand.getCreatedMode()).toBe(Mode.DON);
      expect(nodeRand.getCreatedMode()).toBe(Mode.NODE);
    });

    it("should throw error for invalid mode in random generation", () => {
      enhancedRuntimeGuards.setMode(Mode.UNSPECIFIED);
      expect(() => modeStateManager.getRandom()).toThrow(
        "Invalid mode for random generation"
      );
    });
  });

  describe("Secret Management", () => {
    it("should store and retrieve secrets", () => {
      const secret = { id: "test-secret", value: "secret-value" } as any;

      modeStateManager.storeSecret("test-secret", secret);
      const retrieved = modeStateManager.getStoredSecret("test-secret");

      expect(retrieved).toEqual(secret);
    });

    it("should return undefined for non-existent secrets", () => {
      const retrieved = modeStateManager.getStoredSecret("non-existent");
      expect(retrieved).toBeUndefined();
    });

    it("should clear all secrets", () => {
      const secret1 = { id: "secret1", value: "value1" } as any;
      const secret2 = { id: "secret2", value: "value2" } as any;

      modeStateManager.storeSecret("secret1", secret1);
      modeStateManager.storeSecret("secret2", secret2);

      expect(modeStateManager.getStoredSecret("secret1")).toEqual(secret1);
      expect(modeStateManager.getStoredSecret("secret2")).toEqual(secret2);

      modeStateManager.clearSecrets();

      expect(modeStateManager.getStoredSecret("secret1")).toBeUndefined();
      expect(modeStateManager.getStoredSecret("secret2")).toBeUndefined();
    });
  });

  describe("Debug Information", () => {
    it("should provide comprehensive debug information", () => {
      enhancedRuntimeGuards.setMode(Mode.DON);

      // Make some state changes
      modeStateManager.getNextCallId(); // DON call ID: 1
      modeStateManager.getRandom(); // Create DON random
      modeStateManager.storeSecret("test", {
        id: "test",
        value: "value",
      } as any);

      enhancedRuntimeGuards.setMode(Mode.NODE);
      modeStateManager.getNextCallId(); // NODE call ID: -1

      const debugInfo = modeStateManager.getDebugInfo();

      expect(debugInfo).toEqual({
        currentMode: Mode.NODE,
        donCallId: 1,
        nodeCallId: -1,
        donHasRandom: true,
        nodeHasRandom: false,
        secretCount: 1,
      });
    });
  });

  describe("State Reset", () => {
    it("should reset all state to initial values", () => {
      enhancedRuntimeGuards.setMode(Mode.DON);

      // Make some state changes
      modeStateManager.getNextCallId();
      modeStateManager.getNextCallId();
      modeStateManager.getRandom();
      modeStateManager.storeSecret("test", {
        id: "test",
        value: "value",
      } as any);

      enhancedRuntimeGuards.setMode(Mode.NODE);
      modeStateManager.getNextCallId();

      // Reset
      modeStateManager.reset();

      // Verify everything is back to initial state
      const debugInfo = modeStateManager.getDebugInfo();
      expect(debugInfo.donCallId).toBe(0);
      expect(debugInfo.nodeCallId).toBe(0);
      expect(debugInfo.donHasRandom).toBe(false);
      expect(debugInfo.nodeHasRandom).toBe(false);
      expect(debugInfo.secretCount).toBe(0);
    });
  });

  describe("State Isolation", () => {
    it("should maintain complete isolation between modes", () => {
      // DON mode operations
      enhancedRuntimeGuards.setMode(Mode.DON);
      modeStateManager.getNextCallId(); // 1
      modeStateManager.getNextCallId(); // 2
      const donRand = modeStateManager.getRandom();
      modeStateManager.storeSecret("don-secret", {
        id: "don-secret",
        value: "don-value",
      } as any);

      // NODE mode operations
      enhancedRuntimeGuards.setMode(Mode.NODE);
      modeStateManager.getNextCallId(); // -1
      modeStateManager.getNextCallId(); // -2
      const nodeRand = modeStateManager.getRandom();

      // Verify isolation
      expect(donRand.getCreatedMode()).toBe(Mode.DON);
      expect(nodeRand.getCreatedMode()).toBe(Mode.NODE);
      expect(modeStateManager.getCurrentCallId(Mode.DON)).toBe(2);
      expect(modeStateManager.getCurrentCallId(Mode.NODE)).toBe(-2);

      // Secrets should only be accessible in DON mode
      enhancedRuntimeGuards.setMode(Mode.DON);
      expect(modeStateManager.getStoredSecret("don-secret")).toBeDefined();
    });
  });
});
