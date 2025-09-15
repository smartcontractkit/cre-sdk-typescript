import { create } from '@bufbuild/protobuf'
import { timestampDate, timestampFromDate, type Timestamp } from '@bufbuild/protobuf/wkt'
import type {
	Value as ProtoValue,
	BigInt as ProtoBigInt,
	Map as ProtoMap,
	List as ProtoList,
	Decimal as ProtoDecimal,
} from '@cre/generated/values/v1/values_pb'
import {
	ValueSchema,
	BigIntSchema,
	MapSchema,
	ListSchema,
	DecimalSchema,
} from '@cre/generated/values/v1/values_pb'

export type SupportedValueTypes =
	| 'string'
	| 'bool'
	| 'bytes'
	| 'int64'
	| 'uint64'
	| 'float64'
	| 'bigint'
	| 'time'
	| 'list'
	| 'map'
	| 'decimal'

/**
 * Type that can validate a value and return a typed result.
 * Compatible with Zod schemas, Yup validators, and other similar libraries.
 */
export interface SchemaValidator<T> {
	parse(value: unknown): T
}

/**
 * Options for the unwrapToType function - either use a schema validator OR a factory function, not both.
 */
export type UnwrapOptions<T> =
	| { schema: SchemaValidator<T>; factory?: never }
	| { schema?: never; factory: () => T }

export class Value {
	private readonly value: ProtoValue

	// int64 bounds
	private static readonly INT64_MIN = -(2n ** 63n)
	private static readonly INT64_MAX = 2n ** 63n - 1n
	private static readonly UINT64_MAX = 2n ** 64n - 1n

	// int64 craetes a Value wrapping an int64 value.
	// This can be used to communicate with other languages, as TypeScript doesn't have built-int 64 bit integer types
	public static int64(n: number | bigint | string): Value {
		return new Value(
			create(ValueSchema, {
				value: { case: 'int64Value', value: Value.toInt64Bigint(n) },
			}),
		)
	}

	// uint64 craetes a Value wrapping an uint64 value.
	// This can be used to communicate with other languages, as TypeScript doesn't have built-int 64 bit integer types.
	public static uint64(n: number | bigint | string): Value {
		return new Value(
			create(ValueSchema, {
				value: { case: 'uint64Value', value: Value.toUint64Bigint(n) },
			}),
		)
	}

	// decimal creates a Value wrapping of a decimal.
	// This can be used to communicate with other languages, as TypeScript doesn't have built-int decimal type.
	public static decimal(s: string): Value {
		// Parse decimal string into coefficient (bigint) and exponent (int32)
		const m = /^([+-])?(\d+)(?:\.(\d+))?$/.exec(s.trim())
		if (!m) throw new Error('invalid decimal string')
		const signStr = m[1] ?? '+'
		const intPart = m[2] ?? '0'
		let fracPart = m[3] ?? ''
		// remove trailing zeros in fractional part to normalize
		fracPart = fracPart.replace(/0+$/g, '')
		const exp = fracPart.length === 0 ? 0 : -fracPart.length
		const digits = intPart + fracPart || '0'
		const coeff = BigInt((signStr === '-' ? '-' : '') + digits)
		const decimal: ProtoDecimal = create(DecimalSchema, {
			coefficient: Value.bigIntToProtoBigInt(coeff),
			exponent: exp,
		})

		return new Value(
			create(ValueSchema, {
				value: { case: 'decimalValue', value: decimal },
			}),
		)
	}

	constructor(value: any) {
		if (value instanceof Value) {
			this.value = value.value
		} else if (isValueProto(value)) {
			this.value = value as ProtoValue
		} else {
			this.value = Value.wrapInternal(value)
		}
	}

	get proto(): ProtoValue {
		return this.value
	}

	private static toUint8Array(input: Uint8Array | ArrayBuffer): Uint8Array {
		return input instanceof Uint8Array ? input : new Uint8Array(input)
	}

	/**
	 * Converts a bigint to a byte array using big-endian byte order.
	 * Big-endian means the most significant byte comes first in the array.
	 */
	private static bigintToBytesBE(abs: bigint): Uint8Array {
		if (abs === 0n) return new Uint8Array()
		let hex = abs.toString(16)
		if (hex.length % 2 === 1) hex = '0' + hex
		const len = hex.length / 2
		const out = new Uint8Array(len)
		for (let i = 0; i < len; i++) {
			out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
		}
		return out
	}

	/**
	 * Converts a JavaScript Native bigint to a protobuf BigInt message.
	 */
	private static bigIntToProtoBigInt(v: bigint): ProtoBigInt {
		const sign = v === 0n ? 0n : v < 0n ? -1n : 1n
		const abs = v < 0n ? -v : v
		return create(BigIntSchema, {
			absVal: Value.bigintToBytesBE(abs),
			sign: sign,
		})
	}

	private static toInt64Bigint(v: number | bigint | string): bigint {
		if (typeof v === 'string') {
			const bi: bigint = BigInt(v)
			return Value.toInt64Bigint(bi)
		}
		if (typeof v === 'bigint') {
			if (v > Value.INT64_MAX) throw new Error('int64 overflow')
			else if (v < Value.INT64_MIN) throw new Error('int64 underflow')
			return v
		}

		if (!Number.isFinite(v) || !Number.isInteger(v))
			throw new Error('int64 requires an integer number')
		const bi = BigInt(v)
		if (bi > Value.INT64_MAX) throw new Error('int64 overflow')
		else if (bi < Value.INT64_MIN) throw new Error('int64 underflow')
		return bi
	}

	private static toUint64Bigint(v: number | bigint | string): bigint {
		if (typeof v === 'string') {
			const bi: bigint = BigInt(v)
			return Value.toUint64Bigint(bi)
		}
		if (typeof v === 'bigint') {
			if (v > Value.UINT64_MAX) throw new Error('uint64 overflow')
			else if (v < 0n) throw new Error('uint64 underflow')
			return v
		}

		if (!Number.isFinite(v) || !Number.isInteger(v))
			throw new Error('int64 requires an integer number')
		const bi = BigInt(v)
		if (bi > Value.UINT64_MAX) throw new Error('uint64 overflow')
		else if (bi < 0n) throw new Error('uint64 underflow')
		return bi
	}

	private static toTimestamp(d: Date | number | string): Timestamp {
		const date = d instanceof Date ? d : new Date(d)
		return timestampFromDate(date)
	}

	private static isPlainObject(v: unknown): v is Record<string, unknown> {
		return typeof v === 'object' && v !== null && v.constructor === Object
	}

	private static isObject(v: unknown): v is Record<string, unknown> {
		return typeof v === 'object' && v !== null
	}

	private static wrapInternal(v: unknown): ProtoValue {
		// null/undefined not supported by Value oneof
		if (v === null || v === undefined) throw new Error('cannot wrap null/undefined into Value')

		if (v instanceof Value) {
			return v.proto
		}

		if (v instanceof Uint8Array)
			return create(ValueSchema, { value: { case: 'bytesValue', value: v } })
		if (v instanceof ArrayBuffer)
			return create(ValueSchema, {
				value: { case: 'bytesValue', value: Value.toUint8Array(v) },
			})

		if (v instanceof Date)
			return create(ValueSchema, {
				value: { case: 'timeValue', value: Value.toTimestamp(v) },
			})

		switch (typeof v) {
			case 'string':
				return create(ValueSchema, { value: { case: 'stringValue', value: v } })
			case 'boolean':
				return create(ValueSchema, { value: { case: 'boolValue', value: v } })
			case 'bigint': {
				return create(ValueSchema, {
					value: { case: 'bigintValue', value: Value.bigIntToProtoBigInt(v) },
				})
			}
			case 'number': {
				return create(ValueSchema, { value: { case: 'float64Value', value: v } })
			}
			case 'object':
				break // handled below
			default:
				throw new Error(`unsupported type: ${typeof v}`)
		}

		if (Array.isArray(v)) {
			const fields = v.map(Value.wrapInternal)
			const list: ProtoList = create(ListSchema, { fields })
			return create(ValueSchema, { value: { case: 'listValue', value: list } })
		}

		if (Value.isPlainObject(v)) {
			const fields: Record<string, ProtoValue> = {}
			for (const [k, vv] of Object.entries(v)) {
				fields[k] = Value.wrapInternal(vv)
			}
			const map: ProtoMap = create(MapSchema, { fields })
			return create(ValueSchema, { value: { case: 'mapValue', value: map } })
		}

		// TODO why?
		if (Value.isObject(v) && v.constructor !== Object) {
			// Check for unsupported types specifically
			if (v instanceof Set || v instanceof Map || v instanceof Int8Array) {
				throw new Error('unsupported object instance')
			}

			const fields: Record<string, ProtoValue> = {}
			for (const [k, vv] of Object.entries(v)) {
				fields[k] = Value.wrapInternal(vv)
			}
			const map: ProtoMap = create(MapSchema, { fields })
			return create(ValueSchema, { value: { case: 'mapValue', value: map } })
		}

		throw new Error('unsupported object instance')
	}

	// Instance methods for unwrapping
	unwrap(): unknown {
		return unwrap(this.value)
	}

	/**
	 * Unwraps a Value object into its native JavaScript equivalent and casts it to type T.
	 * If the value is null or undefined, throws an exception.
	 *
	 * @param options - Either a schema validator or a factory function (but not both)
	 * @returns The unwrapped JavaScript value cast to type T
	 * @throws Error if value is null, undefined, contains an invalid case, or fails schema validation
	 */
	unwrapToType<T>(options?: UnwrapOptions<T>): T {
		const unwrapped = this.unwrap()

		if (!options) {
			return unwrapped as T
		}

		// Apply schema validation if provided
		if (options.schema) {
			return options.schema.parse(unwrapped)
		}

		// Apply factory function if provided (preserves methods)
		if (options.factory) {
			const instance = options.factory()

			// Copy properties from unwrapped to the instance
			if (typeof unwrapped === 'object' && unwrapped !== null) {
				// Use Object.assign for more efficient property copying
				Object.assign(instance as object, unwrapped)
			} else {
				// For primitive types, this won't work well
				throw new Error(
					`Cannot copy properties from primitive value to object instance. Use a schema instead.`,
				)
			}

			return instance
		}

		return unwrapped as T
	}
}

/**
 * Unwraps a Value object into its native JavaScript equivalent.
 * If the value is null or undefined, throws an exception.
 *
 * @param value - The Value object to unwrap
 * @returns The unwrapped JavaScript value
 * @throws Error if value is null, undefined, or contains an invalid case
 */
function unwrap(value: ProtoValue): unknown {
	switch (value.value.case) {
		case 'stringValue':
			return value.value.value
		case 'boolValue':
			return value.value.value
		case 'bytesValue':
			return value.value.value
		case 'int64Value':
			return value.value.value
		case 'uint64Value':
			return value.value.value
		case 'float64Value':
			return value.value.value
		case 'bigintValue': {
			const bigIntValue = value.value.value
			const absVal = bigIntValue.absVal
			const sign = bigIntValue.sign

			// Convert bytes to bigint
			let result = 0n
			for (const byte of absVal) {
				result = (result << 8n) | BigInt(byte)
			}

			return sign < 0n ? -result : result
		}
		case 'timeValue': {
			return timestampDate(value.value.value)
		}
		case 'listValue': {
			const list = value.value.value
			return list.fields.map(unwrap)
		}
		case 'mapValue': {
			const map = value.value.value
			const result: Record<string, any> = {}
			for (const [key, val] of Object.entries(map.fields)) {
				result[key] = unwrap(val)
			}
			return result
		}
		case 'decimalValue': {
			const decimal = value.value.value
			const coefficient = decimal.coefficient
			const exponent = decimal.exponent

			if (!coefficient) {
				return '0'
			}

			// Convert coefficient to bigint
			let coeffBigInt: bigint
			const absVal = coefficient.absVal
			const sign = coefficient.sign

			// Convert bytes to bigint
			let result = 0n
			for (const byte of absVal) {
				result = (result << 8n) | BigInt(byte)
			}

			coeffBigInt = sign < 0n ? -result : result

			if (exponent === 0) {
				return coeffBigInt.toString()
			}

			// Handle decimal point placement
			if (exponent < 0) {
				const coeffStr = coeffBigInt.toString().replace('-', '')
				const isNegative = coeffBigInt < 0n
				const absExp = Math.abs(exponent)

				if (coeffStr.length <= absExp) {
					// Need leading zeros
					const zeros = '0'.repeat(absExp - coeffStr.length)
					const sign = isNegative ? '-' : ''
					return `${sign}0.${zeros}${coeffStr}`
				} else {
					// Insert decimal point
					const insertPos = coeffStr.length - absExp
					const withDecimal = coeffStr.slice(0, insertPos) + '.' + coeffStr.slice(insertPos)
					const finalValue = isNegative ? '-' + withDecimal : withDecimal

					// Remove any trailing zeros after the decimal point
					return finalValue.replace(/\.?0+$/, '')
				}
			} else {
				// Positive exponent (multiply by 10^exponent)
				return (coeffBigInt * 10n ** BigInt(exponent)).toString()
			}
		}
		default:
			throw new Error(`Unsupported value type: ${(value.value as any).case}`)
	}
}

function isValueProto(value: any): boolean {
	return (
		value.$typeName && typeof value.$typeName === 'string' && value.$typeName === 'values.v1.Value'
	)
}
