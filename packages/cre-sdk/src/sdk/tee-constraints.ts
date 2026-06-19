import { create } from '@bufbuild/protobuf'
import type { Requirements } from '@cre/generated/sdk/v1alpha/sdk_pb'
import {
	RegionsSchema,
	RequirementsSchema,
	TeeSchema,
	TeeType,
	TeeTypesAndRegionsSchema,
} from '@cre/generated/sdk/v1alpha/sdk_pb'
import { z } from 'zod'

// --- Region schemas (source of truth) ---

export const REGIONS = ['us-west-2'] as const
export const NITRO_REGIONS = ['us-west-2'] as const

const regionSchema = z.enum(REGIONS, {
	message: `unknown region; expected one of: ${REGIONS.join(', ')}`,
})

const nitroRegionSchema = z.enum(NITRO_REGIONS, {
	message: `aws nitro does not support this region; expected one of: ${NITRO_REGIONS.join(', ')}`,
})

// --- TeeConstraint schemas (types inferred from these) ---

const nitroBindingSchema = z
	.object({
		tee: z.literal('nitro'),
		regions: z.array(nitroRegionSchema).nonempty().optional(),
	})
	.strict()

const teeBindingSchema = z.discriminatedUnion('tee', [nitroBindingSchema])

const oneOfTeesSchema = z.array(teeBindingSchema).nonempty()

const anyTeeConstraintSchema = z
	.object({
		regions: z.array(regionSchema).nonempty().optional(),
	})
	.strict()

export const teeConstraintSchema = z.union([oneOfTeesSchema, anyTeeConstraintSchema])

// --- Inferred types ---

export type Region = z.infer<typeof regionSchema>
export type NitroRegion = z.infer<typeof nitroRegionSchema>
export type NitroBinding = z.infer<typeof nitroBindingSchema>
export type TeeBinding = z.infer<typeof teeBindingSchema>
export type OneOfTees = z.infer<typeof oneOfTeesSchema>
export type AnyTeeConstraint = z.infer<typeof anyTeeConstraintSchema>
export type TeeConstraint = z.infer<typeof teeConstraintSchema>

// --- Conversion to protobuf Requirements ---

export function buildTeeRequirements(input: TeeConstraint): Requirements {
	const parsed = teeConstraintSchema.parse(input)

	if (Array.isArray(parsed)) {
		const teeTypes = parsed.map((binding) => ({
			type: teeTypeFromBinding(binding),
			regions: binding.regions ?? [],
		}))
		return create(RequirementsSchema, {
			tee: create(TeeSchema, {
				item: {
					case: 'teeTypesAndRegions',
					value: create(TeeTypesAndRegionsSchema, { teeTypeAndRegions: teeTypes }),
				},
			}),
		})
	}

	return create(RequirementsSchema, {
		tee: create(TeeSchema, {
			item: {
				case: 'anyRegions',
				value: create(RegionsSchema, { regions: parsed.regions ?? [] }),
			},
		}),
	})
}

function teeTypeFromBinding(binding: TeeBinding): TeeType {
	switch (binding.tee) {
		case 'nitro':
			return TeeType.AWS_NITRO
	}
}
