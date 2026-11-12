import { describe, expect, test } from 'bun:test'
import { executionMetadata, type WorkflowExecutionMetadata } from './execution-metadata'
import type { BaseRuntime } from './runtime'

const fixtureDonID = 17
const fixtureFaultTolerance = 3
const zeroFaultTolerance = 0

const expectedMetadata: WorkflowExecutionMetadata = {
	workflowID: '0020350fb4f89856a031268826d6e9b9340996637aa27859baa7b07db58bb020',
	executionID: '9f38bdece8892b3452c401a7a2d5a170f078ab9b2c98c591e24028ce94b33ed2',
	workflowOwner: '5366890c26e8737b89d9084b4c632f7de73d1674',
	donID: fixtureDonID,
	donF: fixtureFaultTolerance,
}

const expectedEmptyMetadata: WorkflowExecutionMetadata = {
	workflowID: '',
	executionID: '',
	workflowOwner: '',
	donID: 0,
	donF: 0,
}

function legacyRuntime(): BaseRuntime<undefined> {
	return {
		config: undefined,
		callCapability: () => {
			throw new Error('unexpected capability call')
		},
		now: () => {
			throw new Error('unexpected time call')
		},
		log: () => {
			throw new Error('unexpected log call')
		},
	}
}

describe('executionMetadata', () => {
	test.each([
		{ name: 'legacy runtime', extension: {} },
		{ name: 'undefined provider', extension: { executionMetadata: undefined } },
		{ name: 'null provider', extension: { executionMetadata: null } },
		{ name: 'non-callable provider', extension: { executionMetadata: 'unsupported' } },
	])('returns zero values for $name', ({ extension }) => {
		// Setup.
		const runtime = Object.assign(legacyRuntime(), extension)

		// Read and verify.
		expect(executionMetadata(runtime)).toEqual(expectedEmptyMetadata)
	})

	test.each([
		{ donF: zeroFaultTolerance },
		{ donF: fixtureFaultTolerance },
	])('reads metadata with F=$donF and preserves the method receiver', ({ donF }) => {
		// Setup.
		const expected = { ...expectedMetadata, donF }
		const runtime = Object.assign(legacyRuntime(), {
			metadata: { ...expectedMetadata, donF },
			executionMetadata() {
				return this.metadata
			},
		})

		// Read and verify.
		expect(executionMetadata(runtime)).toEqual(expected)
	})

	test('returns independent copies even when the provider returns a shared object', () => {
		// Setup.
		const source = { ...expectedMetadata }
		const runtime = Object.assign(legacyRuntime(), { executionMetadata: () => source })

		// Mutate the returned object as JavaScript callers can.
		const first = executionMetadata(runtime)
		Object.assign(first, { workflowID: '', executionID: '', donF: zeroFaultTolerance })

		// Verify.
		expect(source).toEqual(expectedMetadata)
		expect(executionMetadata(runtime)).toEqual(expectedMetadata)
	})

	test('propagates provider errors instead of returning zero metadata', () => {
		const expectedError = new Error('execution metadata unavailable')
		const runtime = Object.assign(legacyRuntime(), {
			executionMetadata() {
				throw expectedError
			},
		})

		expect(() => executionMetadata(runtime)).toThrow(expectedError)
	})

	test('returns independent zero values for legacy runtimes', () => {
		const runtime = legacyRuntime()
		const first = executionMetadata(runtime)

		Object.assign(first, expectedMetadata)

		expect(executionMetadata(runtime)).toEqual(expectedEmptyMetadata)
	})
})
