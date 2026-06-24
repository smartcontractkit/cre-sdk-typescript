/**
 * Capability error codes are primarily based on gRPC error codes:
 * https://grpc.github.io/grpc/core/md_doc_statuscodes.html
 * Custom error codes specific to this project should start from 100 to avoid
 * conflicts with future gRPC codes. Note: 0 (OK) is intentionally excluded
 * because capability errors must always indicate a failure condition.
 */
export type ErrorCode = number

/** Sentinel for error code strings that are not recognised. */
export const UnrecognisedErrorCode = -1

/** Indicates the operation was canceled (typically by the caller). */
export const Canceled = 1

/** Unknown error. */
export const Unknown = 2

/** Client specified an invalid argument. */
export const InvalidArgument = 3

/** Operation expired before completion. */
export const DeadlineExceeded = 4

/** Some requested entity was not found. */
export const NotFound = 5

/** An attempt to create an entity failed because one already exists. */
export const AlreadyExists = 6

/** The caller does not have permission to execute the specified operation. */
export const PermissionDenied = 7

/** Some resource has been exhausted. */
export const ResourceExhausted = 8

/** Operation was rejected because the system is not in a state required for execution. */
export const FailedPrecondition = 9

/** The operation was aborted, typically due to a concurrency issue. */
export const Aborted = 10

/** Operation was attempted past the valid range. */
export const OutOfRange = 11

/** Operation is not implemented or not supported/enabled in this service. */
export const Unimplemented = 12

/** Some invariants expected by the underlying system have been broken. */
export const Internal = 13

/** The service is currently unavailable. */
export const Unavailable = 14

/** Unrecoverable data loss or corruption. */
export const DataLoss = 15

/** The request does not have valid authentication credentials. */
export const Unauthenticated = 16

/** Custom error codes not defined in the gRPC error space. */

/** Failure to reach consensus. */
export const ConsensusFailed = 100

/** A CRE limit breach has occurred. */
export const LimitExceeded = 101

/** Not enough observations to enable the operation to complete. */
export const InsufficientObservations = 102

const errorCodeToString = new Map<number, string>([
	[Canceled, 'Canceled'],
	[Unknown, 'Unknown'],
	[InvalidArgument, 'InvalidArgument'],
	[DeadlineExceeded, 'DeadlineExceeded'],
	[NotFound, 'NotFound'],
	[AlreadyExists, 'AlreadyExists'],
	[PermissionDenied, 'PermissionDenied'],
	[ResourceExhausted, 'ResourceExhausted'],
	[FailedPrecondition, 'FailedPrecondition'],
	[Aborted, 'Aborted'],
	[OutOfRange, 'OutOfRange'],
	[Unimplemented, 'Unimplemented'],
	[Internal, 'Internal'],
	[Unavailable, 'Unavailable'],
	[DataLoss, 'DataLoss'],
	[Unauthenticated, 'Unauthenticated'],
	[ConsensusFailed, 'ConsensusFailed'],
	[LimitExceeded, 'LimitExceeded'],
	[InsufficientObservations, 'InsufficientObservations'],
])

const stringToErrorCode = new Map<string, number>(
	Array.from(errorCodeToString.entries()).map(([code, name]) => [name, code]),
)

/** Returns the string representation of the error code. */
export function errorCodeToStringValue(code: ErrorCode): string {
	return errorCodeToString.get(code) ?? 'UnrecognisedErrorCode'
}

/** Converts a string to an error code. */
export function fromErrorCodeString(str: string): ErrorCode {
	return stringToErrorCode.get(str) ?? UnrecognisedErrorCode
}
