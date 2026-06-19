import { CapabilityExecutionError, fromOriginString, fromVisibilityString } from './error'
import { fromErrorCodeString } from './error-codes'

const errorMessageSeparator = ':'

/**
 * Parses errorMsg in the capability error wire format.
 * If errorMsg is not a serialized capability error, a plain Error is returned.
 */
export function deserializeErrorFromString(errorMsg: string): Error {
	const parts = errorMsg.split(errorMessageSeparator)

	if (parts.length < 4) {
		return new Error(errorMsg)
	}

	const visibility = fromVisibilityString(parts[0])
	const origin = fromOriginString(parts[1])
	const errorCode = fromErrorCodeString(parts[2])
	const detail = parts.slice(3).join(errorMessageSeparator)

	return new CapabilityExecutionError(detail, visibility, origin, errorCode)
}
