import { Mode } from "@cre/generated/sdk/v1alpha/sdk_pb";
import { enhancedRuntimeGuards } from "@cre/sdk/utils/enhanced-runtime-guards";
import { ClientCapability as HTTPClient } from "@cre/generated-sdk/capabilities/networking/http/v1alpha/client_sdk_gen";

/**
 * Enhanced HTTP fetch with mode safety enforcement
 * HTTP operations should typically be performed in NODE mode for consensus
 */
export interface EnhancedFetchOptions {
  url: string;
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: Record<string, string>;
  body?: string;
  timeout?: number;
  mode?: Mode; // Explicit mode specification
  enforceNodeMode?: boolean; // If true, only allows NODE mode
}

/**
 * Enhanced HTTP fetch with comprehensive mode safety
 *
 * By default, HTTP operations are restricted to NODE mode to ensure
 * deterministic consensus behavior. This can be overridden with explicit
 * mode specification.
 *
 * @param options Fetch options with mode safety controls
 * @returns Promise that resolves to HTTP response
 * @throws Error if mode violations are detected
 */
export const enhancedFetch = async (
  options: EnhancedFetchOptions
): Promise<any> => {
  const {
    url,
    method = "GET",
    headers = {},
    body,
    timeout = 30000,
    mode,
    enforceNodeMode = true, // Default to enforcing NODE mode
  } = options;

  // Determine target mode
  const currentMode = enhancedRuntimeGuards.getMode();
  const targetMode = mode || currentMode;

  // Enhanced mode safety checks
  if (enforceNodeMode && targetMode !== Mode.NODE) {
    throw new Error(
      `HTTP fetch operations should be performed in NODE mode for consensus safety. ` +
        `Current mode: ${Mode[currentMode]}. ` +
        `To override this safety check, set enforceNodeMode: false`
    );
  }

  // Verify mode consistency
  if (targetMode !== currentMode) {
    throw new Error(
      `HTTP fetch mode mismatch: requested ${Mode[targetMode]} but currently in ${Mode[currentMode]}`
    );
  }

  // Additional mode safety assertion
  try {
    enhancedRuntimeGuards.assertCapabilitySafe(targetMode);
  } catch (error) {
    throw new Error(
      `HTTP fetch not allowed in current mode: ${(error as Error).message}`
    );
  }

  console.log(
    `[Enhanced Fetch] Making ${method} request to ${url} in ${Mode[targetMode]} mode`
  );

  // Create HTTP client and make request
  const httpClient = new HTTPClient(targetMode);

  try {
    const response = await httpClient.sendRequest({
      url,
      headers,
      timeoutMs: timeout,
      method,
      body,
    });

    console.log(
      `[Enhanced Fetch] Request completed successfully: ${response.statusCode}`
    );

    return {
      status: response.statusCode,
      headers: response.headers,
      body: new TextDecoder().decode(response.body),
      url,
      ok: response.statusCode >= 200 && response.statusCode < 300,
    };
  } catch (error) {
    console.error(`[Enhanced Fetch] Request failed:`, error);
    throw new Error(`HTTP fetch failed: ${(error as Error).message}`);
  }
};

/**
 * Mode-safe GET request
 * @param url URL to fetch
 * @param options Additional options
 * @returns Promise that resolves to response
 */
export const enhancedGet = async (
  url: string,
  options: Omit<EnhancedFetchOptions, "url" | "method"> = {}
): Promise<any> => {
  return enhancedFetch({ ...options, url, method: "GET" });
};

/**
 * Mode-safe POST request
 * @param url URL to post to
 * @param data Data to post
 * @param options Additional options
 * @returns Promise that resolves to response
 */
export const enhancedPost = async (
  url: string,
  data: any,
  options: Omit<EnhancedFetchOptions, "url" | "method" | "body"> = {}
): Promise<any> => {
  const body = typeof data === "string" ? data : JSON.stringify(data);
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  return enhancedFetch({
    ...options,
    url,
    method: "POST",
    body,
    headers,
  });
};

/**
 * Unsafe HTTP fetch that allows any mode (use with caution)
 * This bypasses mode safety checks and should only be used when
 * you explicitly need non-consensus HTTP operations
 *
 * @param options Fetch options
 * @returns Promise that resolves to response
 */
export const unsafeEnhancedFetch = async (
  options: EnhancedFetchOptions
): Promise<any> => {
  return enhancedFetch({ ...options, enforceNodeMode: false });
};

/**
 * Batch HTTP requests with mode safety
 * All requests must be in the same mode
 *
 * @param requests Array of fetch options
 * @param mode Mode for all requests
 * @returns Promise that resolves to array of responses
 */
export const batchEnhancedFetch = async (
  requests: Array<Omit<EnhancedFetchOptions, "mode">>,
  mode: Mode = Mode.NODE
): Promise<any[]> => {
  // Ensure we're in the correct mode for batch requests
  enhancedRuntimeGuards.assertCapabilitySafe(mode);

  const promises = requests.map((request) =>
    enhancedFetch({ ...request, mode })
  );

  return Promise.all(promises);
};
