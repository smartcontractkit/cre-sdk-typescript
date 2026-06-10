import { describe, expect, test } from 'bun:test'
import {
	CapabilityExecutionError,
	fromOriginString,
	fromVisibilityString,
	isCapabilityExecutionError,
	OriginUser,
	VisibilityPublic,
} from './error'
import {
	DeadlineExceeded,
	fromErrorCodeString,
	Unknown,
	UnrecognisedErrorCode,
} from './error-codes'
import { deserializeErrorFromString } from './error-serialization'

function requireCapabilityError(err: unknown): CapabilityExecutionError {
	expect(isCapabilityExecutionError(err)).toBe(true)
	return err as CapabilityExecutionError
}

function capabilityErrorsEqual(a: CapabilityExecutionError, b: CapabilityExecutionError): boolean {
	return (
		a.code === b.code &&
		a.origin === b.origin &&
		a.visibility === b.visibility &&
		a.toString() === b.toString()
	)
}

describe('deserializeErrorFromString invalid fields', () => {
	test('InvalidVisibility', () => {
		const serializedError = 'InvalidVisibility:User:Unknown:some error occurred'
		const deserializedErr = requireCapabilityError(deserializeErrorFromString(serializedError))
		const expectedErr = new CapabilityExecutionError(
			'some error occurred',
			fromVisibilityString('InvalidVisibility'),
			OriginUser,
			Unknown,
		)
		expect(capabilityErrorsEqual(deserializedErr, expectedErr)).toBe(true)
		expect(fromVisibilityString('InvalidVisibility')).toBe(-1)
	})

	test('InvalidOrigin', () => {
		const serializedError = 'Public:InvalidOrigin:Unknown:some error occurred'
		const deserializedErr = requireCapabilityError(deserializeErrorFromString(serializedError))
		const expectedErr = new CapabilityExecutionError(
			'some error occurred',
			VisibilityPublic,
			fromOriginString('InvalidOrigin'),
			Unknown,
		)
		expect(capabilityErrorsEqual(deserializedErr, expectedErr)).toBe(true)
		expect(fromOriginString('InvalidOrigin')).toBe(-1)
	})

	test('UnrecognisedErrorCode', () => {
		const serializedError = 'Public:System:NewUnknownErrorCode:some error occurred'
		const deserializedErr = requireCapabilityError(deserializeErrorFromString(serializedError))
		const expectedErr = new CapabilityExecutionError(
			'some error occurred',
			VisibilityPublic,
			0,
			UnrecognisedErrorCode,
		)
		expect(capabilityErrorsEqual(deserializedErr, expectedErr)).toBe(true)
		expect(fromErrorCodeString('NewUnknownErrorCode')).toBe(UnrecognisedErrorCode)
		expect(deserializedErr.toString()).toBe('some error occurred')
	})

	test('ColonRichPlainMessageMatchingUnknownCode', () => {
		const msg = 'failed:attempt:Unknown: details here'
		const deserializedErr = requireCapabilityError(deserializeErrorFromString(msg))
		const expectedErr = new CapabilityExecutionError(
			' details here',
			fromVisibilityString('failed'),
			fromOriginString('attempt'),
			Unknown,
		)
		expect(capabilityErrorsEqual(deserializedErr, expectedErr)).toBe(true)
	})
})

describe('deserializeErrorFromString non wire format', () => {
	test('InsufficientFields', () => {
		const msg = 'Public:System:Unknown'
		const err = deserializeErrorFromString(msg)
		expect(err.message).toBe(msg)
		expect(isCapabilityExecutionError(err)).toBe(false)
	})

	test('PlainMessage', () => {
		const msg = 'some error has occurred that is not in the serialized capability error format'
		const err = deserializeErrorFromString(msg)
		expect(err.message).toBe(msg)
		expect(isCapabilityExecutionError(err)).toBe(false)
	})
})

describe('deserializeErrorFromString that is not serialised capability error', () => {
	test('plain message returns stdlib error', () => {
		const msg = 'some plain failure'
		const err = deserializeErrorFromString(msg)
		expect(err.message).toBe(msg)
		expect(isCapabilityExecutionError(err)).toBe(false)
	})

	test('valid serialized still returns capability error', () => {
		const serialized = 'Public:User:DeadlineExceeded:detail'
		const expected = new CapabilityExecutionError('detail', VisibilityPublic, OriginUser, DeadlineExceeded)
		const err = deserializeErrorFromString(serialized)
		const deserialized = requireCapabilityError(err)
		expect(capabilityErrorsEqual(expected, deserialized)).toBe(true)
	})

	test('detail with colons preserves colons', () => {
		const detail = 'failed at step: 1: connection refused'
		const serialized = `Public:User:DeadlineExceeded:${detail}`
		const expected = new CapabilityExecutionError(detail, VisibilityPublic, OriginUser, DeadlineExceeded)
		const err = deserializeErrorFromString(serialized)
		const deserialized = requireCapabilityError(err)
		expect(capabilityErrorsEqual(expected, deserialized)).toBe(true)
		expect(deserialized.detail).toBe(detail)
	})
})

describe('CapabilityExecutionError formatting', () => {
	test('recognised code includes code prefix', () => {
		const err = new CapabilityExecutionError('detail', VisibilityPublic, OriginUser, DeadlineExceeded)
		expect(err.toString()).toBe('[4]DeadlineExceeded: detail')
	})

	test('unrecognised code returns detail only', () => {
		const err = new CapabilityExecutionError(
			'detail',
			VisibilityPublic,
			OriginUser,
			UnrecognisedErrorCode,
		)
		expect(err.toString()).toBe('detail')
	})
})
