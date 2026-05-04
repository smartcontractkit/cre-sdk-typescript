/**
 * NoExcess<T, Shape> rejects any property in T whose key is not present in
 * Shape, while preserving the values of allowed properties.
 *
 * Native TS structural typing only triggers excess-property checks on object
 * literals at the call site. Once a request object is bound to a variable
 * its excess keys are tolerated. NoExcess closes that gap by mapping any
 * unknown key to `never`, which fails to assign at the boundary.
 *
 * Recursion stops at:
 *   - primitives / Uint8Array / Date (`Shape[K]` not an indexable object), and
 *   - index-signature maps (every string key is "known"; nothing is excess).
 *
 * Depth bound is set to 6 to keep the tsc work bounded for nested protos.
 */
export type NoExcess<T, Shape, Depth extends number = 6> = Depth extends 0
	? T
	: T extends object
		? Shape extends object
			? IsIndexed<Shape> extends true
				? T
				: {
						[K in keyof T]: K extends keyof Shape
							? NoExcess<T[K], NonNullable<Shape[K]>, Prev<Depth>>
							: never
					}
			: T
		: T

type IsIndexed<T> = string extends keyof T ? true : false

type Prev<N extends number> = [-1, 0, 1, 2, 3, 4, 5, 6][N]

/**
 * Pick the right shape for a capability input.
 *
 * Native protobuf messages carry a `$typeName` brand; JSON shapes do not.
 * If the caller passes a native message we leave it untouched. Otherwise we
 * apply NoExcess against the JSON shape so unknown keys (a stale `body`
 * field, a typo, ...) fail at the call boundary.
 */
export type CapabilityInput<TInput, Native, Json> = [TInput] extends [{ $typeName: string }]
	? Native
	: NoExcess<TInput, Json>
