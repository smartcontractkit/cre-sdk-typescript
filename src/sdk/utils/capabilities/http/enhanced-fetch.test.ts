import { describe, it, expect, beforeEach, mock } from "bun:test";
import { Mode } from "@cre/generated/sdk/v1alpha/sdk_pb";
import { enhancedRuntimeGuards } from "@cre/sdk/utils/enhanced-runtime-guards";
import { modeStateManager } from "@cre/sdk/utils/mode-state-manager";
import {
  enhancedFetch,
  enhancedGet,
  enhancedPost,
  unsafeEnhancedFetch,
} from "./enhanced-fetch";

// Mock the HTTP client
const mockHttpResponse = {
  statusCode: 200,
  headers: { "content-type": "application/json" },
  body: new TextEncoder().encode('{"success": true}'),
};

mock.module(
  "@cre/generated-sdk/capabilities/networking/http/v1alpha/client_sdk_gen",
  () => ({
    ClientCapability: class {
      private mode?: any;

      constructor(mode?: any) {
        this.mode = mode;
      }

      async sendRequest() {
        return mockHttpResponse;
      }
    },
  })
);

describe("Enhanced HTTP Fetch Mode Safety", () => {
  beforeEach(() => {
    // Reset state before each test
    modeStateManager.reset();
    enhancedRuntimeGuards.setMode(Mode.DON);
  });

  describe("enhancedFetch", () => {
    it("should block HTTP requests in DON mode by default", async () => {
      // Ensure we're in DON mode
      expect(enhancedRuntimeGuards.getMode()).toBe(Mode.DON);

      await expect(
        enhancedFetch({
          url: "https://httpbin.org/get",
        })
      ).rejects.toThrow(
        "HTTP fetch operations should be performed in NODE mode for consensus safety"
      );
    });

    it("should allow HTTP requests in NODE mode", async () => {
      // Switch to NODE mode
      enhancedRuntimeGuards.setMode(Mode.NODE);

      const response = await enhancedFetch({
        url: "https://httpbin.org/get",
      });

      expect(response.status).toBe(200);
      expect(response.ok).toBe(true);
    });

    it("should allow DON mode when enforceNodeMode is false", async () => {
      // Stay in DON mode but disable enforcement
      expect(enhancedRuntimeGuards.getMode()).toBe(Mode.DON);

      const response = await enhancedFetch({
        url: "https://httpbin.org/get",
        enforceNodeMode: false,
      });

      expect(response.status).toBe(200);
      expect(response.ok).toBe(true);
    });

    it("should throw error for mode mismatch", async () => {
      // We're in DON mode, but explicitly request NODE mode
      expect(enhancedRuntimeGuards.getMode()).toBe(Mode.DON);

      await expect(
        enhancedFetch({
          url: "https://httpbin.org/get",
          mode: Mode.NODE,
        })
      ).rejects.toThrow("HTTP fetch mode mismatch");
    });

    it("should include detailed error messages", async () => {
      expect(enhancedRuntimeGuards.getMode()).toBe(Mode.DON);

      try {
        await enhancedFetch({
          url: "https://httpbin.org/get",
        });
        expect().fail("Should have thrown an error");
      } catch (error) {
        expect((error as Error).message).toContain(
          "NODE mode for consensus safety"
        );
        expect((error as Error).message).toContain("Current mode: DON");
        expect((error as Error).message).toContain("enforceNodeMode: false");
      }
    });
  });

  describe("enhancedGet", () => {
    it("should block GET requests in DON mode", async () => {
      expect(enhancedRuntimeGuards.getMode()).toBe(Mode.DON);

      await expect(enhancedGet("https://httpbin.org/get")).rejects.toThrow(
        "HTTP fetch operations should be performed in NODE mode"
      );
    });

    it("should allow GET requests in NODE mode", async () => {
      enhancedRuntimeGuards.setMode(Mode.NODE);

      const response = await enhancedGet("https://httpbin.org/get");

      expect(response.status).toBe(200);
      expect(response.ok).toBe(true);
    });
  });

  describe("enhancedPost", () => {
    it("should block POST requests in DON mode", async () => {
      expect(enhancedRuntimeGuards.getMode()).toBe(Mode.DON);

      await expect(
        enhancedPost("https://httpbin.org/post", { test: "data" })
      ).rejects.toThrow(
        "HTTP fetch operations should be performed in NODE mode"
      );
    });

    it("should allow POST requests in NODE mode", async () => {
      enhancedRuntimeGuards.setMode(Mode.NODE);

      const response = await enhancedPost("https://httpbin.org/post", {
        test: "data",
      });

      expect(response.status).toBe(200);
      expect(response.ok).toBe(true);
    });
  });

  describe("unsafeEnhancedFetch", () => {
    it("should bypass mode safety checks", async () => {
      expect(enhancedRuntimeGuards.getMode()).toBe(Mode.DON);

      const response = await unsafeEnhancedFetch({
        url: "https://httpbin.org/get",
      });

      expect(response.status).toBe(200);
      expect(response.ok).toBe(true);
    });

    it("should work in any mode", async () => {
      // Test in DON mode
      expect(enhancedRuntimeGuards.getMode()).toBe(Mode.DON);
      let response = await unsafeEnhancedFetch({
        url: "https://httpbin.org/get",
      });
      expect(response.status).toBe(200);

      // Test in NODE mode
      enhancedRuntimeGuards.setMode(Mode.NODE);
      response = await unsafeEnhancedFetch({
        url: "https://httpbin.org/get",
      });
      expect(response.status).toBe(200);
    });
  });

  describe("Mode Safety Integration", () => {
    it("should work correctly with mode switching", async () => {
      // Start in DON mode - should fail
      expect(enhancedRuntimeGuards.getMode()).toBe(Mode.DON);
      await expect(enhancedGet("https://httpbin.org/get")).rejects.toThrow();

      // Switch to NODE mode - should work
      enhancedRuntimeGuards.setMode(Mode.NODE);
      const response = await enhancedGet("https://httpbin.org/get");
      expect(response.status).toBe(200);

      // Switch back to DON mode - should fail again
      enhancedRuntimeGuards.setMode(Mode.DON);
      await expect(enhancedGet("https://httpbin.org/get")).rejects.toThrow();
    });

    it("should provide consistent error messages", async () => {
      expect(enhancedRuntimeGuards.getMode()).toBe(Mode.DON);

      const methods = [
        () => enhancedGet("https://httpbin.org/get"),
        () => enhancedPost("https://httpbin.org/post", {}),
        () => enhancedFetch({ url: "https://httpbin.org/get" }),
      ];

      for (const method of methods) {
        try {
          await method();
          expect().fail("Should have thrown an error");
        } catch (error) {
          expect((error as Error).message).toContain(
            "NODE mode for consensus safety"
          );
        }
      }
    });
  });
});
