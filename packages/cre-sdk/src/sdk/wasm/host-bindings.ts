import { Mode } from '@cre/generated/sdk/v1alpha/sdk_pb'
import { z } from 'zod'

const numberColumnSchema = z.array(z.number())
const bigintColumnSchema = z.array(z.string().transform((val) => BigInt(val)))
const ProofOfSqlResultSchema = z.discriminatedUnion('verificationStatus', [
	z.object({
		verificationStatus: z.literal('Success'),
		result: z.record(
			z.string(),
			z.discriminatedUnion('type', [
				z.object({ type: z.literal('Boolean'), column: z.array(z.boolean()) }),
				z.object({ type: z.literal('TinyInt'), column: numberColumnSchema }),
				z.object({ type: z.literal('SmallInt'), column: numberColumnSchema }),
				z.object({ type: z.literal('Int'), column: numberColumnSchema }),
				z.object({ type: z.literal('BigInt'), column: bigintColumnSchema }),
				z.object({ type: z.literal('Varchar'), column: z.array(z.string()) }),
				z.object({
					type: z.literal('Decimal75'),
					precision: z.number(),
					scale: z.number(),
					column: bigintColumnSchema,
				}),
				z.object({
					type: z.literal('TimestampTZ'),
					timeUnit: z.union([
						z.literal('Second'),
						z.literal('Millisecond'),
						z.literal('Microsecond'),
						z.literal('Nanosecond'),
					]),
					offset: z.number(),
					column: bigintColumnSchema,
				}),
				z.object({
					type: z.literal('VarBinary'),
					column: z.array(
						z.array(
							z
								.number()
								.min(0)
								.max(255)
								.transform((byteArray) => new Uint8Array(byteArray)),
						),
					),
				}),
				z.object({ type: z.literal('Scalar'), column: bigintColumnSchema }),
			]),
		),
	}),
	z.object({ verificationStatus: z.literal('Failure'), error: z.string() }),
])

// Zod schema for validating global host functions
const globalHostBindingsSchema = z.object({
	switchModes: z.function().args(z.nativeEnum(Mode)).returns(z.void()),
	log: z.function().args(z.string()).returns(z.void()),
	sendResponse: z
		.function()
		.args(z.union([z.instanceof(Uint8Array), z.custom<Uint8Array<ArrayBufferLike>>()]))
		.returns(z.number()),
	versionV2: z.function().args().returns(z.void()),
	callCapability: z
		.function()
		.args(z.union([z.instanceof(Uint8Array), z.custom<Uint8Array<ArrayBufferLike>>()]))
		.returns(z.number()),
	awaitCapabilities: z
		.function()
		.args(z.union([z.instanceof(Uint8Array), z.custom<Uint8Array<ArrayBufferLike>>()]), z.number())
		.returns(z.union([z.instanceof(Uint8Array), z.custom<Uint8Array<ArrayBufferLike>>()])),
	getSecrets: z
		.function()
		.args(z.union([z.instanceof(Uint8Array), z.custom<Uint8Array<ArrayBufferLike>>()]), z.number())
		.returns(z.any()),
	awaitSecrets: z
		.function()
		.args(z.union([z.instanceof(Uint8Array), z.custom<Uint8Array<ArrayBufferLike>>()]), z.number())
		.returns(z.union([z.instanceof(Uint8Array), z.custom<Uint8Array<ArrayBufferLike>>()])),
	getWasiArgs: z.function().args().returns(z.string()),
	now: z.function().args().returns(z.number()),
	proofOfSqlVerify: z
		.function()
		.args(z.string(), z.array(z.string()))
		.returns(z.string().transform((val) => ProofOfSqlResultSchema.parse(JSON.parse(val)))),
})

type GlobalHostBindingsMap = z.infer<typeof globalHostBindingsSchema>

// Validate global host functions at runtime
const validateGlobalHostBindings = (): GlobalHostBindingsMap => {
	const globalFunctions = globalThis as unknown as Partial<GlobalHostBindingsMap>

	try {
		return globalHostBindingsSchema.parse(globalFunctions)
	} catch (error) {
		const missingFunctions = Object.keys(globalHostBindingsSchema.shape).filter(
			(key) => !(key in globalFunctions),
		)

		throw new Error(
			`Missing required global host functions: ${missingFunctions.join(', ')}. ` +
				`This indicates the runtime environment is not properly configured.`,
		)
	}
}

// Initialize validated global functions (lazy evaluation for testing)
let _hostBindings: GlobalHostBindingsMap | null = null

export const hostBindings = new Proxy({} as GlobalHostBindingsMap, {
	get(target, prop) {
		if (!_hostBindings) {
			_hostBindings = validateGlobalHostBindings()
		}
		return _hostBindings[prop as keyof GlobalHostBindingsMap]
	},
})
