import { create } from '@bufbuild/protobuf'
import { type Timestamp, timestampDate, timestampFromDate } from '@bufbuild/protobuf/wkt'
import type {
	BigInt as ProtoBigInt,
	Decimal as ProtoDecimal,
	List as ProtoList,
	Map as ProtoMap,
	Value as ProtoValue,
} from '@cre/generated/values/v1/values_pb'
import {
	BigIntSchema,
	DecimalSchema,
	ListSchema,
	MapSchema,
	ValueSchema,
} from '@cre/generated/values/v1/values_pb'

import type { CreSerializable, PrimitiveTypes } from './serializer_types'

/**
 * Type that can validate a value and return a typed result.
 * Compatible with Zod schemas, Yup validators, and other similar libraries.
 */
export interface SchemaValidator<T> {
	parse(value: unknown): T
}

/**
 * Options for the unwrapToType function -
 * - for primitive types, use the instance option to verify the type matches, the value is ignored.
 * - for non-primitive types, either use a schema validator OR a factory function, not both.
 */
export type UnwrapOptions<T> = T extends PrimitiveTypes
	? { instance: T }
	: { schema: SchemaValidator<T>; factory?: never } | { schema?: never; factory: () => T }

export class Int64 {
	// int64 bounds
	static readonly INT64_MIN = -(2n ** 63n)
	static readonly INT64_MAX = 2n ** 63n - 1n

	public readonly value: bigint

	public static toInt64Bigint(v: number | bigint | string): bigint {
		if (typeof v === 'string') {
			const bi: bigint = BigInt(v)
			return Int64.toInt64Bigint(bi)
		}

		if (typeof v === 'bigint') {
			if (v > Int64.INT64_MAX) throw new Error('int64 overflow')
			else if (v < Int64.INT64_MIN) throw new Error('int64 underflow')
			return v
		}

		if (!Number.isFinite(v) || !Number.isInteger(v))
			throw new Error('int64 requires an integer number')

		const bi = BigInt(v)
		if (bi > Int64.INT64_MAX) throw new Error('int64 overflow')
		else if (bi < Int64.INT64_MIN) throw new Error('int64 underflow')
		return bi
	}

	public constructor(v: number | bigint | string) {
		this.value = Int64.toInt64Bigint(v)
	}

	public add(i: Int64, safe: boolean = true): Int64 {
		return safe
			? new Int64(this.value + i.value)
			: new Int64(BigInt.asIntN(64, this.value + i.value))
	}

	public sub(i: Int64, safe: boolean = true): Int64 {
		return safe
			? new Int64(this.value - i.value)
			: new Int64(BigInt.asIntN(64, this.value - i.value))
	}

	public mul(i: Int64, safe: boolean = true): Int64 {
		return safe
			? new Int64(this.value * i.value)
			: new Int64(BigInt.asIntN(64, this.value * i.value))
	}

	public div(i: Int64, safe: boolean = true): Int64 {
		return new Int64(this.value / i.value)
	}
}

export class UInt64 {
	static readonly UINT64_MAX = 2n ** 64n - 1n
	public readonly value: bigint

	public static toUint64Bigint(v: number | bigint | string): bigint {
		if (typeof v === 'string') {
			const bi: bigint = BigInt(v)
			return UInt64.toUint64Bigint(bi)
		}
		if (typeof v === 'bigint') {
			if (v > UInt64.UINT64_MAX) throw new Error('uint64 overflow')
			else if (v < 0n) throw new Error('uint64 underflow')
			return v
		}

		if (!Number.isFinite(v) || !Number.isInteger(v))
			throw new Error('int64 requires an integer number')
		const bi = BigInt(v)
		if (bi > UInt64.UINT64_MAX) throw new Error('uint64 overflow')
		else if (bi < 0n) throw new Error('uint64 underflow')
		return bi
	}

	public constructor(v: number | bigint | string) {
		this.value = UInt64.toUint64Bigint(v)
	}

	public add(i: UInt64, safe: boolean = true): UInt64 {
		return safe
			? new UInt64(this.value + i.value)
			: new UInt64(BigInt.asUintN(64, this.value + i.value))
	}

	public sub(i: UInt64, safe: boolean = true): UInt64 {
		return safe
			? new UInt64(this.value - i.value)
			: new UInt64(BigInt.asUintN(64, this.value - i.value))
	}

	public mul(i: UInt64, safe: boolean = true): UInt64 {
		return safe
			? new UInt64(this.value * i.value)
			: new UInt64(BigInt.asUintN(64, this.value * i.value))
	}

	public div(i: UInt64, safe: boolean = true): UInt64 {
		return new UInt64(this.value / i.value)
	}
}

export class Decimal {
	public static parse(s: string): Decimal {
		// Parse decimal string into coefficient (bigint) and exponent (int32)
		const m = /^([+-])?(\d+)(?:\.(\d+))?$/.exec(s.trim())
		if (!m) throw new Error('invalid decimal string')
		const signStr = m[1] ?? '+'
		const intPart = m[2] ?? '0'
		let fracPart = m[3] ?? ''
		// remove trailing zeros in fractional part to normalize
		// Use simple loop instead of regex to avoid ReDoS vulnerability
		while (fracPart.length > 0 && fracPart[fracPart.length - 1] === '0') {
			fracPart = fracPart.slice(0, -1)
		}
		const exponent = fracPart.length === 0 ? 0 : -fracPart.length
		const digits = intPart + fracPart || '0'
		const coeffecient = BigInt((signStr === '-' ? '-' : '') + digits)
		return new Decimal(coeffecient, exponent)
	}
	constructor(
		public readonly coeffecient: bigint,
		public readonly exponent: number,
	) {}
}

export class Value {
	private readonly value: ProtoValue

	public static from<T>(value: CreSerializable<T>): Value {
		return new Value(value)
	}

	public static wrap(value: ProtoValue): Value {
		return new Value(value)
	}

	private constructor(value: any) {
		if (value instanceof Value) {
			this.value = value.value
		} else if (isValueProto(value)) {
			this.value = value as ProtoValue
		} else {
			this.value = Value.wrapInternal(value)
		}
	}

	proto(): ProtoValue {
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
			return v.proto()
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

		if (v instanceof Int64) {
			return create(ValueSchema, {
				value: { case: 'int64Value', value: v.value },
			})
		}

		if (v instanceof UInt64) {
			return create(ValueSchema, {
				value: { case: 'uint64Value', value: v.value },
			})
		}

		if (v instanceof Decimal) {
			const decimalProto: ProtoDecimal = create(DecimalSchema, {
				coefficient: Value.bigIntToProtoBigInt(v.coeffecient),
				exponent: v.exponent,
			})
			return create(ValueSchema, {
				value: { case: 'decimalValue', value: decimalProto },
			})
		}

		switch (typeof v) {
			case 'string':
				return create(ValueSchema, {
					value: { case: 'stringValue', value: v },
				})
			case 'boolean':
				return create(ValueSchema, { value: { case: 'boolValue', value: v } })
			case 'bigint': {
				return create(ValueSchema, {
					value: { case: 'bigintValue', value: Value.bigIntToProtoBigInt(v) },
				})
			}
			case 'number': {
				return create(ValueSchema, {
					value: { case: 'float64Value', value: v },
				})
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

		if (Value.isObject(v) && v.constructor !== Object) {
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
	 * @param options - Either a schema validator or a factory function (but not both), used for non-primitive types
	 * @returns The unwrapped JavaScript value cast to type T
	 * @throws Error if value is null, undefined, contains an invalid case, or fails schema validation
	 */
	unwrapToType<T>(options: UnwrapOptions<T>): T {
		const unwrapped = this.unwrap()

		if ('instance' in options) {
			if (typeof unwrapped !== typeof options.instance) {
				throw new Error(`Cannot unwrap to type ${typeof options.instance}`)
			}
			return unwrapped as T
		}

		if (options.schema) {
			return options.schema.parse(unwrapped)
		}

		const obj = options.factory()

		if (typeof unwrapped === 'object' && unwrapped !== null) {
			// Use Object.assign for more efficient property copying
			Object.assign(obj as object, unwrapped)
		} else {
			throw new Error(
				`Cannot copy properties from primitive value to object instance. Use a schema instead.`,
			)
		}

		return obj
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
			return new Int64(value.value.value)
		case 'uint64Value':
			return new UInt64(value.value.value)
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
				return new Decimal(0n, 0)
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

			return new Decimal(coeffBigInt, exponent)
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
