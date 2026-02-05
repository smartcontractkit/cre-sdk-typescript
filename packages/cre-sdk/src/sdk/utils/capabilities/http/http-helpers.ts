import type { MessageInitShape } from '@bufbuild/protobuf'
import type { ResponseTemplate } from '@cre/generated/capabilities/networking/confidentialhttp/v1alpha/client_pb'
import type {
	Request,
	RequestSchema,
	Response,
} from '@cre/generated/capabilities/networking/http/v1alpha/client_pb'
import type { ReportResponse } from '@cre/generated/sdk/v1alpha/sdk_pb'
import type {
	ClientCapability,
	SendRequester,
} from '@cre/generated-sdk/capabilities/networking/http/v1alpha/client_sdk_gen'
import type { NodeRuntime } from '@cre/sdk'
import type { Report } from '@cre/sdk/report'
import { decodeJson } from '@cre/sdk/utils/decode-json'

/**
 * HTTP Response Helper Functions
 *
 * These utility functions provide a convenient way to work with HTTP Response objects,
 * mimicking the native Response API methods like .json(), .text(), and .arrayBuffer().
 *
 * @example
 * ```typescript
 * import { text, json, ok, getHeader } from './http-helpers'
 *
 * // Direct usage with Response object
 * const response = sendRequester.sendRequest({ url: 'https://api.example.com/data' }).result()
 *
 * // Check if response is successful
 * if (!ok(response)) {
 *   throw new Error(`Request failed with status: ${response.statusCode}`)
 * }
 *
 * // Get response as text (automatically trimmed)
 * const responseText = text(response)
 *
 * // Parse JSON response
 * const data = json(response)
 *
 * // Get specific header
 * const contentType = getHeader(response, 'content-type')
 * ```
 *
 * @example
 * ```typescript
 * // Function overload usage
 * const responseFn = sendRequester.sendRequest({ url: 'https://api.example.com/data' })
 *
 * // Check if response is successful
 * if (!ok(() => ({ result: responseFn.result() })).result()) {
 *   const response = responseFn.result()
 *   throw new Error(`Request failed with status: ${response.statusCode}`)
 * }
 *
 * // Get response as text (automatically trimmed)
 * const responseText = text(() => ({ result: responseFn.result() })).result()
 * ```
 */

/**
 * Returns the response body as a UTF-8 string, automatically trimmed
 * @param response - The Response object
 * @returns The body as a trimmed string
 */
export function text(response: Response | ResponseTemplate): string
/**
 * Returns the response body as a UTF-8 string, automatically trimmed
 * @param responseFn - Function that returns an object with result function that returns Response
 * @returns Object with result function that returns the body as a trimmed string
 */
export function text(responseFn: () => { result: Response | ResponseTemplate }): {
	result: () => string
}
export function text(
	responseOrFn: Response | ResponseTemplate | (() => { result: Response | ResponseTemplate }),
): string | { result: () => string } {
	if (typeof responseOrFn === 'function') {
		return {
			result: () => text(responseOrFn().result),
		}
	} else {
		const decoder = new TextDecoder('utf-8')
		return decoder.decode(responseOrFn.body).trim()
	}
}

/**
 * Parses the response body as JSON
 * @param response - The Response object
 * @returns The parsed JSON
 * @throws Error if the body is not valid JSON
 */
export function json(response: Response | ResponseTemplate): unknown
/**
 * Parses the response body as JSON
 * @param responseFn - Function that returns an object with result function that returns Response
 * @returns Object with result function that returns the parsed JSON
 * @throws Error if the body is not valid JSON
 */
export function json(responseFn: () => { result: Response | ResponseTemplate }): {
	result: () => unknown
}
export function json(
	responseOrFn: Response | ResponseTemplate | (() => { result: Response | ResponseTemplate }),
): unknown | { result: () => unknown } {
	if (typeof responseOrFn === 'function') {
		return {
			result: () => json(responseOrFn().result),
		}
	}

	return decodeJson(responseOrFn.body)
}

/**
 * Gets a specific header value
 * @param response - The Response object
 * @param name - The header name (case-insensitive)
 * @returns The header value or undefined if not found
 */
export function getHeader(response: Response, name: string): string | undefined
/**
 * Gets a specific header value
 * @param responseFn - Function that returns an object with result function that returns Response
 * @param name - The header name (case-insensitive)
 * @returns Object with result function that returns the header value or undefined if not found
 */
export function getHeader(
	responseFn: () => { result: Response },
	name: string,
): { result: () => string | undefined }
export function getHeader(
	responseOrFn: Response | (() => { result: Response }),
	name: string,
): string | undefined | { result: () => string | undefined } {
	if (typeof responseOrFn === 'function') {
		return {
			result: () => getHeader(responseOrFn().result, name),
		}
	} else {
		const lowerName = name.toLowerCase()
		return Object.entries(responseOrFn.headers).find(
			([key]) => key.toLowerCase() === lowerName,
		)?.[1]
	}
}

/**
 * Checks if the response status indicates success (200-299)
 * @param response - The Response object
 * @returns True if the status code is in the 200-299 range
 */
export function ok(response: Response | ResponseTemplate): boolean
/**
 * Checks if the response status indicates success (200-299)
 * @param responseFn - Function that returns an object with result function that returns Response
 * @returns Object with result function that returns true if the status code is in the 200-299 range
 */
export function ok(responseFn: () => { result: Response | ResponseTemplate }): {
	result: () => boolean
}
export function ok(
	responseOrFn: Response | ResponseTemplate | (() => { result: Response | ResponseTemplate }),
): boolean | { result: () => boolean } {
	if (typeof responseOrFn === 'function') {
		return {
			result: () => ok(responseOrFn().result),
		}
	} else {
		return responseOrFn.statusCode >= 200 && responseOrFn.statusCode < 300
	}
}

// ============================================================================
// SendReport Helper Methods for ClientCapability and SendRequester
// ============================================================================

/**
 * SendReport functions the same as SendRequest, but takes a Report and a function
 * to convert the inner ReportResponse to a Request.
 * Note that caching is limited as reports may contain different sets of signatures
 * on different nodes, leading to a cache miss.
 *
 * @param runtime - The runtime instance
 * @param report - The Report to process
 * @param fn - Function to convert ReportResponse to Request
 * @returns Response result function
 */
function sendReport(
	this: ClientCapability,
	runtime: NodeRuntime<unknown>,
	report: Report,
	fn: (reportResponse: ReportResponse) => Request | MessageInitShape<typeof RequestSchema>,
): { result: () => Response } {
	const rawReport = report.x_generatedCodeOnly_unwrap()
	const request = fn(rawReport)
	return this.sendRequest(runtime, request)
}

/**
 * SendReport functions the same as SendRequest, but takes a Report and a function
 * to convert the inner ReportResponse to a Request.
 * Note that caching is limited as reports may contain different sets of signatures
 * on different nodes, leading to a cache miss.
 *
 * @param report - The Report to process
 * @param fn - Function to convert ReportResponse to Request
 * @returns Response result function
 */
function sendRequesterSendReport(
	this: SendRequester,
	report: Report,
	fn: (reportResponse: ReportResponse) => Request | MessageInitShape<typeof RequestSchema>,
): { result: () => Response } {
	const rawReport = report.x_generatedCodeOnly_unwrap()
	const request = fn(rawReport)
	return this.sendRequest(request)
}

// ============================================================================
// Prototype Extensions
// ============================================================================

// Import the actual classes for prototype extension
import {
	ClientCapability as ClientCapabilityClass,
	SendRequester as SendRequesterClass,
} from '@cre/generated-sdk/capabilities/networking/http/v1alpha/client_sdk_gen'

// Extend ClientCapability prototype
ClientCapabilityClass.prototype.sendReport = sendReport

// Extend SendRequester prototype
SendRequesterClass.prototype.sendReport = sendRequesterSendReport

// ============================================================================
// Type Declarations for Prototype Extensions
// ============================================================================

// Augment the module declarations to include the new methods
declare module '@cre/generated-sdk/capabilities/networking/http/v1alpha/client_sdk_gen' {
	interface ClientCapability {
		/**
		 * SendReport functions the same as SendRequest, but takes a Report and a function
		 * to convert the inner ReportResponse to a Request.
		 * Note that caching is limited as reports may contain different sets of signatures
		 * on different nodes, leading to a cache miss.
		 *
		 * @param runtime - The runtime instance
		 * @param report - The Report to process
		 * @param fn - Function to convert ReportResponse to Request
		 * @returns Response result function
		 */
		sendReport(
			runtime: NodeRuntime<unknown>,
			report: Report,
			fn: (reportResponse: ReportResponse) => Request | MessageInitShape<typeof RequestSchema>,
		): { result: () => Response }
	}

	interface SendRequester {
		/**
		 * SendReport functions the same as SendRequest, but takes a Report and a function
		 * to convert the inner ReportResponse to a Request.
		 * Note that caching is limited as reports may contain different sets of signatures
		 * on different nodes, leading to a cache miss.
		 *
		 * @param report - The Report to process
		 * @param fn - Function to convert ReportResponse to Request
		 * @returns Response result function
		 */
		sendReport(
			report: Report,
			fn: (reportResponse: ReportResponse) => Request | MessageInitShape<typeof RequestSchema>,
		): { result: () => Response }
	}
}
