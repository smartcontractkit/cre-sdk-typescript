import type { Response } from './client_pb'

/**
 * HTTP Response Helper Functions
 *
 * These utility functions provide a convenient way to work with HTTP Response objects,
 * mimicking the native Response API methods like .json(), .text(), and .arrayBuffer().
 *
 * @example
 * ```typescript
 * import { text, json, ok, getHeader } from './client_helpers'
 *
 * const response = sendRequester.sendRequest({ url: 'https://api.example.com/data' }).result()
 *
 * // Check if response is successful
 * if (!ok(response).result()) {
 *   throw new Error(`Request failed with status: ${response.statusCode}`)
 * }
 *
 * // Get response as text
 * const responseText = text(response).result()
 *
 * // Parse JSON response
 * const data = json(response).result()
 *
 * // Get specific header
 * const contentType = getHeader(response, 'content-type').result()
 * ```
 */

/**
 * Returns the response body as a UTF-8 string
 * @param response - The Response object
 * @returns The body as a string
 */
export function text(response: Response): string
/**
 * Returns the response body as a UTF-8 string
 * @param responseFn - Function that returns an object with result function that returns Response
 * @returns Object with result function that returns the body as a string
 */
export function text(responseFn: () => { result: Response }): {
	result: () => string
}
export function text(
	responseOrFn: Response | (() => { result: Response }),
): string | { result: () => string } {
	if (typeof responseOrFn === 'function') {
		return {
			result: () => {
				const response = responseOrFn().result
				const decoder = new TextDecoder('utf-8')
				return decoder.decode(response.body)
			},
		}
	} else {
		const decoder = new TextDecoder('utf-8')
		return decoder.decode(responseOrFn.body)
	}
}

/**
 * Parses the response body as JSON
 * @param response - The Response object
 * @returns The parsed JSON
 * @throws Error if the body is not valid JSON
 */
export function json(response: Response): unknown
/**
 * Parses the response body as JSON
 * @param responseFn - Function that returns an object with result function that returns Response
 * @returns Object with result function that returns the parsed JSON
 * @throws Error if the body is not valid JSON
 */
export function json(responseFn: () => { result: Response }): {
	result: () => unknown
}
export function json(
	responseOrFn: Response | (() => { result: Response }),
): unknown | { result: () => unknown } {
	if (typeof responseOrFn === 'function') {
		return {
			result: () => {
				const response = responseOrFn().result
				const decoder = new TextDecoder('utf-8')
				const textBody = decoder.decode(response.body)
				return JSON.parse(textBody)
			},
		}
	} else {
		const decoder = new TextDecoder('utf-8')
		const textBody = decoder.decode(responseOrFn.body)
		return JSON.parse(textBody)
	}
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
			result: () => {
				const response = responseOrFn().result
				const lowerName = name.toLowerCase()
				return Object.entries(response.headers).find(
					([key]) => key.toLowerCase() === lowerName,
				)?.[1]
			},
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
export function ok(response: Response): boolean
/**
 * Checks if the response status indicates success (200-299)
 * @param responseFn - Function that returns an object with result function that returns Response
 * @returns Object with result function that returns true if the status code is in the 200-299 range
 */
export function ok(responseFn: () => { result: Response }): {
	result: () => boolean
}
export function ok(
	responseOrFn: Response | (() => { result: Response }),
): boolean | { result: () => boolean } {
	if (typeof responseOrFn === 'function') {
		return {
			result: () => {
				const response = responseOrFn().result
				return response.statusCode >= 200 && response.statusCode < 300
			},
		}
	} else {
		return responseOrFn.statusCode >= 200 && responseOrFn.statusCode < 300
	}
}
