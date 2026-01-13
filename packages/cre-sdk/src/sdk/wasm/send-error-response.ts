import { create, toBinary } from '@bufbuild/protobuf'
import { ExecutionResultSchema } from '@cre/generated/sdk/v1alpha/sdk_pb'
import { hostBindings } from './host-bindings'

/**
 * Prepares an error response payload from an error.
 * This is a pure function that converts an error to a serialized ExecutionResult.
 *
 * @param error - The error to prepare
 * @returns The serialized error response payload, or null if the error cannot be converted to a string
 */
export const prepareErrorResponse = (error: unknown): Uint8Array | null => {
	let errorMessage: string | null = null
	if (error instanceof Error) {
		errorMessage = error.message
	} else if (typeof error === 'string') {
		errorMessage = error
	} else {
		errorMessage = String(error) || null
	}

	if (typeof errorMessage !== 'string') {
		return null
	}

	const result = create(ExecutionResultSchema, {
		result: { case: 'error', value: errorMessage },
	})

	return toBinary(ExecutionResultSchema, result)
}

/**
 * Sends an error response through the Javy bridge.
 * This is used internally by the SDK as an error handler for the main() function,
 * catching exceptions that bubbled up to the top level.
 *
 * @param error - The error to send
 */
export const sendErrorResponse = (error: unknown): void => {
	const payload = prepareErrorResponse(error)
	if (payload === null) {
		return
	}

	hostBindings.sendResponse(payload)
}
