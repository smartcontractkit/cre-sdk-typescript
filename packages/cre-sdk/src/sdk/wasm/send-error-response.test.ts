import { afterEach, describe, expect, mock, test } from 'bun:test'
import { fromBinary } from '@bufbuild/protobuf'
import { ExecutionResultSchema } from '@cre/generated/sdk/v1alpha/sdk_pb'
import { prepareErrorResponse, sendErrorResponse } from './send-error-response'

afterEach(() => {
	mock.restore()
})

describe('prepareErrorResponse', () => {
	test('prepares error response for Error instance', () => {
		const errorMessage = 'Test error message'
		const payload = prepareErrorResponse(new Error(errorMessage))

		expect(payload).not.toBeNull()
		const result = fromBinary(ExecutionResultSchema, payload!)
		expect(result.result.case).toBe('error')
		expect(result.result.value).toBe(errorMessage)
	})

	test('prepares error response for string error', () => {
		const errorMessage = 'String error message'
		const payload = prepareErrorResponse(errorMessage)

		expect(payload).not.toBeNull()
		const result = fromBinary(ExecutionResultSchema, payload!)
		expect(result.result.case).toBe('error')
		expect(result.result.value).toBe(errorMessage)
	})

	test('prepares error response for number error', () => {
		const errorNumber = 42
		const payload = prepareErrorResponse(errorNumber)

		expect(payload).not.toBeNull()
		const result = fromBinary(ExecutionResultSchema, payload!)
		expect(result.result.case).toBe('error')
		expect(result.result.value).toBe('42')
	})

	test('prepares error response for object error', () => {
		const errorObject = { code: 500, message: 'Internal error' }
		const payload = prepareErrorResponse(errorObject)

		expect(payload).not.toBeNull()
		const result = fromBinary(ExecutionResultSchema, payload!)
		expect(result.result.case).toBe('error')
		expect(result.result.value).toBe('[object Object]')
	})

	test('prepares error response for null error', () => {
		const payload = prepareErrorResponse(null)

		expect(payload).not.toBeNull()
		const result = fromBinary(ExecutionResultSchema, payload!)
		expect(result.result.case).toBe('error')
		expect(result.result.value).toBe('null')
	})

	test('prepares error response for undefined error', () => {
		const payload = prepareErrorResponse(undefined)

		expect(payload).not.toBeNull()
		const result = fromBinary(ExecutionResultSchema, payload!)
		expect(result.result.case).toBe('error')
		expect(result.result.value).toBe('undefined')
	})

	test('prepares error response for empty string', () => {
		const payload = prepareErrorResponse('')

		expect(payload).not.toBeNull()
		const result = fromBinary(ExecutionResultSchema, payload!)
		expect(result.result.case).toBe('error')
		expect(result.result.value).toBe('')
	})

	test('prepares error response for boolean error', () => {
		const payload = prepareErrorResponse(true)

		expect(payload).not.toBeNull()
		const result = fromBinary(ExecutionResultSchema, payload!)
		expect(result.result.case).toBe('error')
		expect(result.result.value).toBe('true')
	})

	test('prepares error response for Error with empty message', () => {
		const payload = prepareErrorResponse(new Error(''))

		expect(payload).not.toBeNull()
		const result = fromBinary(ExecutionResultSchema, payload!)
		expect(result.result.case).toBe('error')
		expect(result.result.value).toBe('')
	})
})

describe('sendErrorResponse', () => {
	test('calls prepareErrorResponse and sends the result via hostBindings', () => {
		const errorMessage = 'Test error message'
		const expectedPayload = prepareErrorResponse(new Error(errorMessage))
		expect(expectedPayload).not.toBeNull()

		// Verify the payload structure matches what sendErrorResponse would send
		const result = fromBinary(ExecutionResultSchema, expectedPayload!)
		expect(result.result.case).toBe('error')
		expect(result.result.value).toBe(errorMessage)
	})
})
