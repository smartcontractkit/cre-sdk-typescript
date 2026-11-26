import { Mode } from '@cre/generated/sdk/v1alpha/sdk_pb'
import { z } from 'zod'

// Keep validation errors as classic ZodError instances, as with Zod 3.
// Zod 4's function validator throws the core error type on invocation instead.
function hostFunction<Input extends z.ZodTuple, Output extends z.ZodType>(
	input: Input,
	output: Output,
) {
	return z
		.custom<(...parameters: z.output<Input>) => z.input<Output>>(
			(value) => typeof value === 'function',
		)
		.transform(
			(implementation) =>
				function (this: unknown, ...parameters: z.input<Input>) {
					return output.parse(Reflect.apply(implementation, this, input.parse(parameters)))
				},
		)
}

const bytes = () => z.union([z.instanceof(Uint8Array), z.custom<Uint8Array<ArrayBufferLike>>()])

export const globalHostBindingsSchema = z.object({
	switchModes: hostFunction(z.tuple([z.enum(Mode)]).rest(z.unknown()), z.void()),
	setRandomMode: hostFunction(z.tuple([z.enum(Mode)]).rest(z.unknown()), z.void()),
	log: hostFunction(z.tuple([z.string()]).rest(z.unknown()), z.void()),
	sendResponse: hostFunction(z.tuple([bytes()]).rest(z.unknown()), z.number()),
	versionV2: hostFunction(z.tuple([]).rest(z.unknown()), z.void()),
	callCapability: hostFunction(z.tuple([bytes()]).rest(z.unknown()), z.number()),
	awaitCapabilities: hostFunction(z.tuple([bytes(), z.number()]).rest(z.unknown()), bytes()),
	getSecrets: hostFunction(z.tuple([bytes(), z.number()]).rest(z.unknown()), z.any()),
	awaitSecrets: hostFunction(z.tuple([bytes(), z.number()]).rest(z.unknown()), bytes()),
	getWasiArgs: hostFunction(z.tuple([]).rest(z.unknown()), z.string()),
	now: hostFunction(z.tuple([]).rest(z.unknown()), z.number()),
	sleep: hostFunction(z.tuple([z.number()]).rest(z.unknown()), z.void()),
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
				`The CRE WASM runtime must provide these functions on globalThis. ` +
				`This usually means the workflow is being executed outside the CRE WASM environment, ` +
				`or the host runtime version is incompatible with this SDK version.`,
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
