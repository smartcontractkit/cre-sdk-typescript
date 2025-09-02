import { describe, it, expect, beforeEach } from "bun:test";
import { Mode } from "@cre/generated/sdk/v1alpha/sdk_pb";
import { EnhancedRuntimeGuards } from "./enhanced-runtime-guards";

describe("EnhancedRuntimeGuards", () => {
  let guards: EnhancedRuntimeGuards;

  beforeEach(() => {
    guards = new EnhancedRuntimeGuards();
  });

  describe("Mode Management", () => {
    it("should initialize in DON mode", () => {
      expect(guards.getMode()).toBe(Mode.DON);
    });

    it("should allow switching modes", () => {
      guards.setMode(Mode.NODE);
      expect(guards.getMode()).toBe(Mode.NODE);

      guards.setMode(Mode.DON);
      expect(guards.getMode()).toBe(Mode.DON);
    });
  });

  describe("DON Mode Safety", () => {
    it("should allow DON operations in DON mode", () => {
      guards.setMode(Mode.DON);
      expect(() => guards.assertDonSafe()).not.toThrow();
    });

    it("should block DON operations in NODE mode", () => {
      guards.setMode(Mode.NODE);
      expect(() => guards.assertDonSafe()).toThrow(
        "cannot use Runtime inside RunInNodeMode"
      );
    });
  });

  describe("NODE Mode Safety", () => {
    it("should allow NODE operations in NODE mode", () => {
      guards.setMode(Mode.NODE);
      expect(() => guards.assertNodeSafe()).not.toThrow();
    });

    it("should block NODE operations in DON mode", () => {
      guards.setMode(Mode.DON);
      expect(() => guards.assertNodeSafe()).toThrow(
        "cannot use NodeRuntime outside RunInNodeMode"
      );
    });
  });

  describe("Random Safety", () => {
    it("should allow random usage in same mode", () => {
      guards.setMode(Mode.DON);
      expect(() => guards.assertRandomSafe(Mode.DON)).not.toThrow();

      guards.setMode(Mode.NODE);
      expect(() => guards.assertRandomSafe(Mode.NODE)).not.toThrow();
    });

    it("should block random usage in different mode", () => {
      guards.setMode(Mode.DON);
      expect(() => guards.assertRandomSafe(Mode.NODE)).toThrow(
        "random cannot be used outside the mode it was created in"
      );

      guards.setMode(Mode.NODE);
      expect(() => guards.assertRandomSafe(Mode.DON)).toThrow(
        "random cannot be used outside the mode it was created in"
      );
    });

    it("should include mode information in random error messages", () => {
      guards.setMode(Mode.DON);
      try {
        guards.assertRandomSafe(Mode.NODE);
        expect().fail("Should have thrown an error");
      } catch (error) {
        expect((error as Error).message).toContain("Created in NODE");
        expect((error as Error).message).toContain("currently in DON");
      }
    });
  });

  describe("Secret Safety", () => {
    it("should allow secret access in DON mode", () => {
      guards.setMode(Mode.DON);
      expect(() => guards.assertSecretSafe()).not.toThrow();
    });

    it("should block secret access in NODE mode", () => {
      guards.setMode(Mode.NODE);
      expect(() => guards.assertSecretSafe()).toThrow(
        "secrets can only be accessed in DON mode"
      );
    });

    it("should block secret access in other modes", () => {
      guards.setMode(Mode.UNSPECIFIED);
      expect(() => guards.assertSecretSafe()).toThrow(
        "secrets can only be accessed in DON mode"
      );
    });
  });

  describe("Capability Safety", () => {
    it("should delegate to appropriate mode checks", () => {
      // DON mode capability in DON mode - should work
      guards.setMode(Mode.DON);
      expect(() => guards.assertCapabilitySafe(Mode.DON)).not.toThrow();

      // NODE mode capability in NODE mode - should work
      guards.setMode(Mode.NODE);
      expect(() => guards.assertCapabilitySafe(Mode.NODE)).not.toThrow();

      // DON mode capability in NODE mode - should fail
      guards.setMode(Mode.NODE);
      expect(() => guards.assertCapabilitySafe(Mode.DON)).toThrow();

      // NODE mode capability in DON mode - should fail
      guards.setMode(Mode.DON);
      expect(() => guards.assertCapabilitySafe(Mode.NODE)).toThrow();
    });
  });

  describe("Mode Transitions", () => {
    it("should properly update guard states on mode changes", () => {
      // Start in DON mode
      guards.setMode(Mode.DON);
      expect(() => guards.assertDonSafe()).not.toThrow();
      expect(() => guards.assertNodeSafe()).toThrow();

      // Switch to NODE mode
      guards.setMode(Mode.NODE);
      expect(() => guards.assertDonSafe()).toThrow();
      expect(() => guards.assertNodeSafe()).not.toThrow();

      // Switch back to DON mode
      guards.setMode(Mode.DON);
      expect(() => guards.assertDonSafe()).not.toThrow();
      expect(() => guards.assertNodeSafe()).toThrow();
    });

    it("should clear errors for unspecified mode", () => {
      guards.setMode(Mode.UNSPECIFIED);
      expect(() => guards.assertDonSafe()).not.toThrow();
      expect(() => guards.assertNodeSafe()).not.toThrow();
    });
  });
});
