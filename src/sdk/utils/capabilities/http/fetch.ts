import { z } from "zod";
import { cre } from "@cre/sdk/cre";

const httpMethodSchema = z.enum([
  "GET",
  "POST",
  "PUT",
  "DELETE",
  "PATCH",
  "HEAD",
  "OPTIONS",
  "TRACE",
  "CONNECT",
]);

const cacheSettingsSchema = z
  .object({
    readFromCache: z.boolean().optional(),
    maxAgeMs: z.number().int().optional(),
  })
  .optional();

const creFetchRequestSchema = z.object({
  url: z.string().url("Must provide a valid URL"),
  method: httpMethodSchema.optional().default("GET"),
  headers: z.record(z.string()).optional(),
  body: z.string().optional(),
  timeoutMs: z.number().int().positive().optional(),
  cacheSettings: cacheSettingsSchema,
});

export type CreFetchRequest = {
  url: string;
  method?:
    | "GET"
    | "POST"
    | "PUT"
    | "DELETE"
    | "PATCH"
    | "HEAD"
    | "OPTIONS"
    | "TRACE"
    | "CONNECT";
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
  cacheSettings?: {
    readFromCache?: boolean;
    maxAgeMs?: number;
  };
};

/**
 * Enhanced HTTP fetch utility with validation and sensible defaults.
 *
 * Validates input parameters using Zod schema and sets default values:
 * - Default HTTP method is "GET"
 * - URL is required and must be valid
 * - HTTP method must be one of the standard methods
 *
 * @param input - Request configuration object
 * @returns Promise resolving to the HTTP response
 * @throws ZodError if input validation fails
 *
 * @example
 * ```typescript
 * // Simple GET request (method defaults to "GET")
 * const response = await creFetch({ url: "https://api.example.com/data" });
 *
 * // POST request with body and headers
 * const response = await creFetch({
 *   url: "https://api.example.com/submit",
 *   method: "POST",
 *   headers: { "Content-Type": "application/json" },
 *   body: JSON.stringify({ key: "value" })
 * });
 * ```
 */
export const creFetch = async (input: CreFetchRequest) => {
  const validatedInput = creFetchRequestSchema.parse(input);
  const httpClient = new cre.capabilities.HTTPClient();

  const resp = await httpClient.sendRequest(validatedInput);

  return {
    statusCode: resp.statusCode,
    headers: resp.headers,
    body: new TextDecoder().decode(resp.body),
  };
};
