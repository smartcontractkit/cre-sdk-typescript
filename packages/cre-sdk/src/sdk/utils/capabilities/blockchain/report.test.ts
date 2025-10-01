import { describe, expect, test } from 'bun:test'
import { create } from '@bufbuild/protobuf'
import { AttributedSignatureSchema, ReportResponseSchema } from '@cre/generated/sdk/v1alpha/sdk_pb'
import { createReportRequest, Report, reportToJson } from './report'

describe('Report', () => {
	test('should wrap ReportResponse correctly', () => {
		const mockSigs = [
			create(AttributedSignatureSchema, {
				signature: new Uint8Array([10, 11]),
				signerId: 1,
			}),
			create(AttributedSignatureSchema, {
				signature: new Uint8Array([20, 21]),
				signerId: 2,
			}),
		]

		const response = create(ReportResponseSchema, {
			configDigest: new Uint8Array([1, 2, 3]),
			seqNr: 42n,
			reportContext: new Uint8Array([4, 5, 6]),
			rawReport: new Uint8Array([7, 8, 9]),
			sigs: mockSigs,
		})

		const report = new Report(response)

		expect(report.configDigest).toEqual(new Uint8Array([1, 2, 3]))
		expect(report.seqNr).toBe(42n)
		expect(report.reportContext).toEqual(new Uint8Array([4, 5, 6]))
		expect(report.rawReport).toEqual(new Uint8Array([7, 8, 9]))
		expect(report.sigs).toHaveLength(2)
		expect(report.sigs[0].signature).toEqual(new Uint8Array([10, 11]))
		expect(report.sigs[0].signerId).toBe(1)
	})

	test('should provide access to underlying response', () => {
		const response = create(ReportResponseSchema, {
			configDigest: new Uint8Array([1, 2, 3]),
			seqNr: 42n,
			reportContext: new Uint8Array([4, 5, 6]),
			rawReport: new Uint8Array([7, 8, 9]),
			sigs: [],
		})

		const report = new Report(response)

		expect(report.response).toBe(response)
	})

	test('should handle empty signatures', () => {
		const response = create(ReportResponseSchema, {
			configDigest: new Uint8Array([1, 2, 3]),
			seqNr: 42n,
			reportContext: new Uint8Array([4, 5, 6]),
			rawReport: new Uint8Array([7, 8, 9]),
			sigs: [],
		})

		const report = new Report(response)

		expect(report.sigs).toHaveLength(0)
	})
})

describe('createReportRequest', () => {
	test('should create a ReportRequest with Uint8Array payload', () => {
		const payload = new Uint8Array([1, 2, 3, 4])
		const request = createReportRequest({
			encodedPayload: payload,
			encoderName: 'evm',
			signingAlgo: 'ecdsa',
			hashingAlgo: 'keccak256',
		})

		expect(request.encodedPayload).toEqual(payload)
		expect(request.encoderName).toBe('evm')
		expect(request.signingAlgo).toBe('ecdsa')
		expect(request.hashingAlgo).toBe('keccak256')
	})

	test('should create a ReportRequest with base64 string payload', () => {
		const base64Payload = 'AQIDBA==' // [1, 2, 3, 4] in base64
		const request = createReportRequest({
			encodedPayload: base64Payload,
			encoderName: 'evm',
			signingAlgo: 'ecdsa',
			hashingAlgo: 'keccak256',
		})

		expect(request.encodedPayload).toEqual(new Uint8Array([1, 2, 3, 4]))
		expect(request.encoderName).toBe('evm')
	})

	test('should accept custom encoder and algo names', () => {
		const request = createReportRequest({
			encodedPayload: new Uint8Array([1, 2, 3]),
			encoderName: 'custom-encoder',
			signingAlgo: 'custom-signing',
			hashingAlgo: 'custom-hashing',
		})

		expect(request.encoderName).toBe('custom-encoder')
		expect(request.signingAlgo).toBe('custom-signing')
		expect(request.hashingAlgo).toBe('custom-hashing')
	})
})

describe('reportToJson', () => {
	test('should convert Report to JSON format', () => {
		const mockSigs = [
			create(AttributedSignatureSchema, {
				signature: new Uint8Array([10, 11]),
				signerId: 1,
			}),
			create(AttributedSignatureSchema, {
				signature: new Uint8Array([20, 21]),
				signerId: 2,
			}),
		]

		const response = create(ReportResponseSchema, {
			configDigest: new Uint8Array([1, 2, 3]),
			seqNr: 42n,
			reportContext: new Uint8Array([4, 5, 6]),
			rawReport: new Uint8Array([7, 8, 9]),
			sigs: mockSigs,
		})

		const report = new Report(response)
		const json = reportToJson(report)

		expect(json.configDigest).toBe(Buffer.from([1, 2, 3]).toString('base64'))
		expect(json.seqNr).toBe('42')
		expect(json.reportContext).toBe(Buffer.from([4, 5, 6]).toString('base64'))
		expect(json.rawReport).toBe(Buffer.from([7, 8, 9]).toString('base64'))
		expect(json.sigs).toHaveLength(2)
		expect(json.sigs[0].signature).toBe(Buffer.from([10, 11]).toString('base64'))
		expect(json.sigs[0].signerId).toBe(1)
	})

	test('should handle empty signatures in JSON conversion', () => {
		const response = create(ReportResponseSchema, {
			configDigest: new Uint8Array([1, 2, 3]),
			seqNr: 0n,
			reportContext: new Uint8Array([]),
			rawReport: new Uint8Array([]),
			sigs: [],
		})

		const report = new Report(response)
		const json = reportToJson(report)

		expect(json.sigs).toHaveLength(0)
		expect(json.seqNr).toBe('0')
	})
})
