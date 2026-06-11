/**
 * CRE capability errors and wire format shared across CRE components.
 * Aligns with github.com/smartcontractkit/chainlink-common/pkg/capabilities/errors.
 */
import { type ErrorCode, errorCodeToStringValue, UnrecognisedErrorCode } from './error-codes'

export type Origin = number

/** The error originated from a system issue. */
export const OriginSystem = 0

/** The error originated from user input or action. */
export const OriginUser = 1

export function originToString(origin: Origin): string {
	switch (origin) {
		case OriginSystem:
			return 'System'
		case OriginUser:
			return 'User'
		default:
			return 'UnknownOrigin'
	}
}

/** Converts a string to an Origin value. */
export function fromOriginString(s: string): Origin {
	switch (s) {
		case 'System':
			return OriginSystem
		case 'User':
			return OriginUser
		default:
			return -1
	}
}

export type Visibility = number

/** The full details of the error can be shared across all nodes in the network. */
export const VisibilityPublic = 0

/** The error contains sensitive information visible only to the local node. */
export const VisibilityPrivate = 1

export function visibilityToString(visibility: Visibility): string {
	switch (visibility) {
		case VisibilityPublic:
			return 'Public'
		case VisibilityPrivate:
			return 'Private'
		default:
			return 'UnknownVisibility'
	}
}

/** Converts a string to a Visibility value. */
export function fromVisibilityString(s: string): Visibility {
	switch (s) {
		case 'Public':
			return VisibilityPublic
		case 'Private':
			return VisibilityPrivate
		default:
			return -1
	}
}

export class CapabilityExecutionError extends Error {
	public readonly name = 'CapabilityExecutionError'

	constructor(
		public readonly detail: string,
		public readonly visibility: Visibility,
		public readonly origin: Origin,
		public readonly code: ErrorCode,
	) {
		super(
			code === UnrecognisedErrorCode
				? detail
				: `[${code}]${errorCodeToStringValue(code)}: ${detail}`,
		)
	}

	override toString(): string {
		return this.message
	}
}

export function isCapabilityExecutionError(err: unknown): err is CapabilityExecutionError {
	return err instanceof CapabilityExecutionError
}
