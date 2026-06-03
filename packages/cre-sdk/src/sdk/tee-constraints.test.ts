import { describe, expect, test } from 'bun:test'
import { create, toBinary } from '@bufbuild/protobuf'
import {
	RegionsSchema,
	RequirementsSchema,
	TeeSchema,
	TeeType,
	TeeTypesAndRegionsSchema,
} from '@cre/generated/sdk/v1alpha/sdk_pb'
import { ZodError } from 'zod'
import { buildTeeRequirements, teeConstraintSchema } from './tee-constraints'
import type { TeeConstraint } from './tee-constraints'

describe('teeConstraintSchema', () => {
	test('accepts empty object (any tee)', () => {
		expect(teeConstraintSchema.parse({})).toEqual({})
	})

	test('accepts object with valid regions (any tee in regions)', () => {
		expect(teeConstraintSchema.parse({ regions: ['us-west-2'] })).toEqual({
			regions: ['us-west-2'],
		})
	})

	test('accepts nitro binding with regions', () => {
		expect(teeConstraintSchema.parse([{ tee: 'nitro', regions: ['us-west-2'] }])).toEqual([
			{ tee: 'nitro', regions: ['us-west-2'] },
		])
	})

	test('accepts nitro binding without regions', () => {
		expect(teeConstraintSchema.parse([{ tee: 'nitro' }])).toEqual([{ tee: 'nitro' }])
	})

	test('rejects unknown region in anyTee form', () => {
		expect(() => teeConstraintSchema.parse({ regions: ['mars-central-1'] })).toThrow(ZodError)
	})

	test('rejects unknown region in nitro binding', () => {
		expect(() =>
			teeConstraintSchema.parse([{ tee: 'nitro', regions: ['eu-central-1'] }]),
		).toThrow(ZodError)
	})

	test('rejects unknown tee type', () => {
		expect(() => teeConstraintSchema.parse([{ tee: 'sgx' }])).toThrow(ZodError)
	})

	test('rejects empty array', () => {
		expect(() => teeConstraintSchema.parse([])).toThrow(ZodError)
	})

	test('rejects empty regions array in anyTee', () => {
		expect(() => teeConstraintSchema.parse({ regions: [] })).toThrow(ZodError)
	})

	test('rejects empty regions array in nitro binding', () => {
		expect(() => teeConstraintSchema.parse([{ tee: 'nitro', regions: [] }])).toThrow(ZodError)
	})

	test('rejects unknown fields in anyTee', () => {
		expect(() => teeConstraintSchema.parse({ foo: 1 })).toThrow(ZodError)
	})

	test('rejects unknown fields in nitro binding', () => {
		expect(() => teeConstraintSchema.parse([{ tee: 'nitro', extra: 1 }])).toThrow(ZodError)
	})

	test('rejects null', () => {
		expect(() => teeConstraintSchema.parse(null)).toThrow(ZodError)
	})

	test('rejects bare string', () => {
		expect(() => teeConstraintSchema.parse('any')).toThrow(ZodError)
	})
})

describe('buildTeeRequirements', () => {
	test('anyTee produces anyRegions with empty regions', () => {
		const result = buildTeeRequirements({})
		const expected = create(RequirementsSchema, {
			tee: create(TeeSchema, {
				item: {
					case: 'anyRegions',
					value: create(RegionsSchema, { regions: [] }),
				},
			}),
		})
		expect(toBinary(RequirementsSchema, result)).toEqual(toBinary(RequirementsSchema, expected))
	})

	test('anyTeeInRegions produces anyRegions with specified regions', () => {
		const result = buildTeeRequirements({ regions: ['us-west-2'] })
		const expected = create(RequirementsSchema, {
			tee: create(TeeSchema, {
				item: {
					case: 'anyRegions',
					value: create(RegionsSchema, { regions: ['us-west-2'] }),
				},
			}),
		})
		expect(toBinary(RequirementsSchema, result)).toEqual(toBinary(RequirementsSchema, expected))
	})

	test('oneOfTees nitro with regions produces teeTypesAndRegions', () => {
		const result = buildTeeRequirements([{ tee: 'nitro', regions: ['us-west-2'] }])
		const expected = create(RequirementsSchema, {
			tee: create(TeeSchema, {
				item: {
					case: 'teeTypesAndRegions',
					value: create(TeeTypesAndRegionsSchema, {
						teeTypeAndRegions: [{ type: TeeType.AWS_NITRO, regions: ['us-west-2'] }],
					}),
				},
			}),
		})
		expect(toBinary(RequirementsSchema, result)).toEqual(toBinary(RequirementsSchema, expected))
	})

	test('oneOfTees nitro without regions produces teeTypesAndRegions with empty regions', () => {
		const result = buildTeeRequirements([{ tee: 'nitro' }])
		const expected = create(RequirementsSchema, {
			tee: create(TeeSchema, {
				item: {
					case: 'teeTypesAndRegions',
					value: create(TeeTypesAndRegionsSchema, {
						teeTypeAndRegions: [{ type: TeeType.AWS_NITRO, regions: [] }],
					}),
				},
			}),
		})
		expect(toBinary(RequirementsSchema, result)).toEqual(toBinary(RequirementsSchema, expected))
	})

	test('throws on invalid input', () => {
		expect(() => buildTeeRequirements('bad' as unknown as TeeConstraint)).toThrow(ZodError)
	})
})
