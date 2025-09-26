import type { Decimal, Int64, UInt64 } from './value'

export type NumericType = number | bigint | Date | Decimal | Int64 | UInt64
export type PrimitiveTypes = NumericType | boolean | string
export type NonSerializable =
	| null
	| Map<unknown, unknown>
	| Set<unknown>
	| RegExp
	| Int8Array
	| Promise<unknown>

export type CreSerializableNested<T> = T extends PrimitiveTypes
	? T
	: T extends Function
		? T
		: T extends NonSerializable
			? never
			: T extends any[]
				? CreSerializableNested<T[number]>[]
				: T extends object
					? { [K in keyof T]: CreSerializableNested<T[K]> }
					: never

export type CreSerializable<T> = T extends PrimitiveTypes
	? T
	: T extends Function
		? never
		: T extends NonSerializable
			? never
			: T extends any[]
				? CreSerializableNested<T[number]>[]
				: T extends object
					? { [K in keyof T]: CreSerializableNested<T[K]> }
					: never

export type TypeVerifier<T, U> = T extends U ? true : false
