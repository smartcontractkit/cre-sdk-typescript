import { Mode } from '@cre/generated/sdk/v1beta/sdk_pb'
import { z } from 'zod'

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
