import { describe, expect, test } from 'bun:test'
import { create } from '@bufbuild/protobuf'
import { FieldMaskSchema, TimestampSchema, timestampDate } from '@bufbuild/protobuf/wkt'
import type { Value as ProtoValue } from '@cre/generated/values/v1/values_pb'
import {
	BigIntSchema,
	DecimalSchema,
	ListSchema,
	MapSchema,
	ValueSchema,
} from '@cre/generated/values/v1/values_pb'
import { Decimal, Int64, UInt64, Value } from './value'

const bytesToBigIntBE = (bytes: Uint8Array): bigint => {
	let out = 0n
	for (const b of bytes) out = (out << 8n) + BigInt(b)
	return out
}

const expectProto = (actual: ProtoValue, expected: NonNullable<ProtoValue['value']>) => {
	expect(actual.value).toBeDefined()
	expect(actual.value).toEqual(expected)
}

const expectValue = (actual: Value, expected: NonNullable<ProtoValue['value']>) => {
	expectProto(actual.proto(), expected)
	expect(actual.unwrap()).toEqual(expected.value)
}

function expectCase<
	C extends NonNullable<ProtoValue['value']['case']>,
	V = Extract<NonNullable<ProtoValue['value']>, { case: C }>['value'],
>(actual: ProtoValue, expectedCase: C): V {
	expect(actual.value).toBeDefined()
	expect(actual.value.case).toBe(expectedCase)
	return actual.value.value as V
}

describe('val helpers', () => {
	test('another value', () => {
		const val = Value.from('10')
		const val2 = Value.from(val)
		expect(val).toEqual(val2)
	})

	test('nested value', () => {
		const val = Value.from(10)
		const val2 = Value.from({ foo: 99, val: val })
		expectProto(val2.proto(), {
			case: 'mapValue',
			value: create(MapSchema, {
				fields: {
					foo: create(ValueSchema, { value: { case: 'float64Value', value: 99 } }),
					val: create(ValueSchema, { value: { case: 'float64Value', value: 10 } }),
				},
			}),
		})
	})

	describe('protos directly', () => {
		type ValueCase = NonNullable<NonNullable<ProtoValue['value']>['case']>

		type AllTests = { [K in ValueCase]: { proto: ProtoValue; expected: any } }
		const allCases: AllTests = {
			stringValue: {
				proto: create(ValueSchema, {
					value: { case: 'stringValue', value: 'hello' },
				}),
				expected: 'hello',
			},
			boolValue: {
				proto: create(ValueSchema, {
					value: { case: 'boolValue', value: true },
				}),
				expected: true,
			},
			bytesValue: {
				proto: create(ValueSchema, {
					value: { case: 'bytesValue', value: new Uint8Array([1, 2, 3]) },
				}),
				expected: new Uint8Array([1, 2, 3]),
			},
			float64Value: {
				proto: create(ValueSchema, {
					value: { case: 'float64Value', value: 3.14159 },
				}),
				expected: 3.14159,
			},
			int64Value: {
				proto: create(ValueSchema, {
					value: { case: 'int64Value', value: 42n },
				}),
				expected: new Int64(42n),
			},
			uint64Value: {
				proto: create(ValueSchema, {
					value: { case: 'uint64Value', value: 42n },
				}),
				expected: new UInt64(42n),
			},
			timeValue: {
				proto: create(ValueSchema, {
					value: {
						case: 'timeValue',
						value: create(TimestampSchema, {
							seconds: 1700000123n,
							nanos: 456000000,
						}),
					},
				}),
				expected: new Date(1700000123456),
			},
			bigintValue: {
				proto: create(ValueSchema, {
					value: {
						case: 'bigintValue',
						value: create(BigIntSchema, {
							absVal: new Uint8Array([0x01, 0x23, 0x45, 0x67, 0x89]),
							sign: 1n,
						}),
					},
				}),
				expected: 0x0123456789n,
			},
			listValue: {
				proto: create(ValueSchema, {
					value: {
						case: 'listValue',
						value: create(ListSchema, {
							fields: [
								create(ValueSchema, { value: { case: 'stringValue', value: 'item1' } }),
								create(ValueSchema, { value: { case: 'float64Value', value: 2.5 } }),
							],
						}),
					},
				}),
				expected: ['item1', 2.5],
			},
			mapValue: {
				proto: create(ValueSchema, {
					value: {
						case: 'mapValue',
						value: create(MapSchema, {
							fields: {
								key1: create(ValueSchema, { value: { case: 'stringValue', value: 'value1' } }),
								key2: create(ValueSchema, { value: { case: 'float64Value', value: 2.5 } }),
							},
						}),
					},
				}),
				expected: { key1: 'value1', key2: 2.5 },
			},
			decimalValue: {
				proto: create(ValueSchema, {
					value: {
						case: 'decimalValue',
						value: create(DecimalSchema, {
							coefficient: create(BigIntSchema, {
								absVal: new Uint8Array([0x04, 0xd2]), // 1234 in big-endian
								sign: 1n,
							}),
							exponent: -2,
						}),
					},
				}),
				expected: new Decimal(1234n, -2),
			},
		}

		const possibleCases = Object.keys(allCases) as ValueCase[]
		possibleCases.forEach((caseType) => {
			const testCase = allCases[caseType]

			test(`handles ${caseType} correctly`, () => {
				var val = Value.wrap(testCase.proto)

				expect(val.proto().value).toBeDefined()
				expect(val.proto().value!.case).toBe(caseType)

				expect(val.unwrap()).toEqual(testCase.expected)
			})
		})
	})

	test('string', () => {
		expectValue(Value.from('hello'), { case: 'stringValue', value: 'hello' })
	})

	test('bool', () => {
		const val = Value.from(true)
		expectValue(Value.from(true), { case: 'boolValue', value: true })
	})

	test('bytes Uint8Array', () => {
		const data = new Uint8Array([1, 2, 3])
		const val = Value.from(data)
		expectValue(val, { case: 'bytesValue', value: new Uint8Array([1, 2, 3]) })
	})

	test('bytes ArrayBuffer', () => {
		const ab = new Uint8Array([1, 2, 3])
		const val = Value.from(ab.buffer)
		expectValue(val, { case: 'bytesValue', value: new Uint8Array([1, 2, 3]) })
	})

	// Use expectProto instead and verify against the int64 etc
	test('int64 from number', () => {
		const val = Value.from(new Int64(42))
		const pb = expectCase(val.proto(), 'int64Value')
		expect(pb).toBe(42n)
		expect(val.unwrap()).toEqual(new Int64(42))
	})

	test('int64 from bigint within range', () => {
		const val = Value.from(new Int64(123n))
		const pb = expectCase(val.proto(), 'int64Value')
		expect(pb).toBe(123n)
		expect(val.unwrap()).toEqual(new Int64(123n))
	})

	test('int64 throws on non-integer number', () => {
		expect(() => new Int64(1.5)).toThrow()
	})

	test('int64 overflow throws (number)', () => {
		// larger than int64 max
		const tooBig = Number(2n ** 63n)
		expect(Number.isFinite(tooBig)).toBe(true)
		expect(() => new Int64(tooBig)).toThrow()
	})

	test('int64 underflow throws (number)', () => {
		// smaller than int64 min
		const tooSmall = Number(-(2n ** 64n))
		expect(Number.isFinite(tooSmall)).toBe(true)
		expect(() => new Int64(tooSmall)).toThrow()
	})

	test('int64 from string ', () => {
		const val = Value.from(new Int64('-42'))
		const pb = expectCase(val.proto(), 'int64Value')
		expect(pb).toBe(-42n)
		expect(val.unwrap()).toEqual(new Int64(-42))
	})

	test('uint64 from number', () => {
		const val = Value.from(new UInt64(42))
		const pb = expectCase(val.proto(), 'uint64Value')
		expect(pb).toBe(42n)
		expect(val.unwrap()).toEqual(new UInt64(42))
	})

	test('uint64 from bigint within range', () => {
		const val = Value.from(new UInt64(123n))
		const pb = expectCase(val.proto(), 'uint64Value')
		expect(pb).toBe(123n)
		expect(val.unwrap()).toEqual(new UInt64(123n))
	})

	test('uint64 throws on non-integer number', () => {
		expect(() => new UInt64(1.5)).toThrow()
	})

	test('uint64 overflow throws (number)', () => {
		// larger than uint64 max
		const tooBig = Number(2n ** 64n)
		expect(Number.isFinite(tooBig)).toBe(true)
		expect(() => new UInt64(tooBig)).toThrow()
	})

	test('uint64 underflow throws (number)', () => {
		// larger than uint64 min
		const tooSmall = Number(-1)
		expect(Number.isFinite(tooSmall)).toBe(true)
		expect(() => new UInt64(tooSmall)).toThrow()
	})

	test('uint64 from string ', () => {
		const val = Value.from(new UInt64('42'))
		const pb = expectCase(val.proto(), 'uint64Value')
		expect(pb).toBe(42n)
		expect(val.unwrap()).toEqual(new UInt64(42n))
	})

	test('float64', () => {
		// safe, since the any rounding would occur before the nubmer is a float
		// this does a copy without math
		expectValue(Value.from(3.14), { case: 'float64Value', value: 3.14 })
	})

	test('float64 supports NaN and Infinity', () => {
		const nan = Value.from(NaN)
		var value = expectCase(nan.proto(), 'float64Value')
		expect(Number.isNaN(value)).toBe(true)
		const unwrappedNaN = nan.unwrap()
		expect(Number.isNaN(unwrappedNaN)).toBe(true)

		const inf = Value.from(Infinity)
		var value = expectCase(inf.proto(), 'float64Value')
		expect(Number.isFinite(value)).toBe(false)
		const unwrappedInf = inf.unwrap()
		expect(Number.isFinite(unwrappedInf)).toBe(false)
	})

	test('bigint encodes sign and abs bytes', () => {
		const big = -123456789012345678901234567890n
		const val = Value.from(big)

		const pb = expectCase(val.proto(), 'bigintValue')
		expect(pb.sign).toBe(-1n)
		const abs = bytesToBigIntBE(pb.absVal)
		expect(abs).toBe(-big)
		const unwrapped = val.unwrap()

		expect(unwrapped).toEqual(big)
	})

	test('time from Date', () => {
		const d = new Date(1700000123456)
		const val = Value.from(d)

		const ts = expectCase(val.proto(), 'timeValue')
		expect(timestampDate(ts)).toEqual(d)
		const unwrapped = val.unwrap()

		expect(unwrapped).toEqual(d)
	})

	test('list', () => {
		const items = [1, 'x', true]
		const val = Value.from(items)

		const protoItems = expectCase(val.proto(), 'listValue').fields
		expect(protoItems).toHaveLength(3)
		expectProto(protoItems[0], { case: 'float64Value', value: 1 })
		expectProto(protoItems[1], { case: 'stringValue', value: 'x' })
		expectProto(protoItems[2], { case: 'boolValue', value: true })

		const unwrapped = val.unwrap()
		expect(unwrapped).toEqual(items)
	})

	test('list empty', () => {
		const val = Value.from([])

		const protoItems = expectCase(val.proto(), 'listValue').fields
		expect(protoItems).toHaveLength(0)
	})

	test('map', () => {
		const inputMap = { d: 1.25, s: 'ok' }
		const val = Value.from(inputMap)

		const m = expectCase(val.proto(), 'mapValue').fields

		expect(Object.keys(m)).toHaveLength(2)
		expectProto(m['d'], { case: 'float64Value', value: 1.25 })
		expectProto(m['s'], { case: 'stringValue', value: 'ok' })

		expect(val.unwrap()).toEqual(inputMap)
	})

	test('map empty', () => {
		const val = Value.from({})

		const m = expectCase(val.proto(), 'mapValue').fields
		expect(Object.keys(m)).toHaveLength(0)

		const unwrapped = val.unwrap() as Record<string, unknown>
		expect(Object.keys(unwrapped)).toHaveLength(0)
	})

	test('from object with schema', () => {
		var schemaCalled = false
		const personSchema = {
			parse: (value: unknown) => {
				schemaCalled = true
				if (typeof value !== 'object' || value === null) {
					throw new Error('Expected an object')
				}

				const v = value as any
				if (typeof v.name !== 'string' || typeof v.age !== 'number') {
					throw new Error('Invalid person schema')
				}

				return { name: v.name, age: v.age }
			},
		}

		const person = { name: 'Alice', age: 30 }
		const val = Value.from(person)

		// Test unwrapToType with schema
		const unwrapped = val.unwrapToType({ schema: personSchema })
		expect(unwrapped).toEqual(person)
		expect(schemaCalled).toBe(true)
	})

	test('from object with constructor', () => {
		class Test {
			public i: number = 0
			public s: string = ''
			constructor() {}
			getI(): number {
				return this.i
			}
		}

		const inputObject = new Test()
		inputObject.i = 123
		inputObject.s = 'abc'
		const val = Value.from(inputObject)

		const fields = expectCase(val.proto(), 'mapValue').fields
		expect(Object.keys(fields)).toHaveLength(2)
		expectProto(fields['i'], { case: 'float64Value', value: 123 })
		expectProto(fields['s'], { case: 'stringValue', value: 'abc' })

		const rawUnwrapped = val.unwrap()
		expect(rawUnwrapped).toEqual({ i: 123, s: 'abc' })

		var factoryCalled = false
		const unwrappedObject = val.unwrapToType<Test>({
			factory: () => {
				factoryCalled = true
				return new Test()
			},
		})
		expect(unwrappedObject).toEqual(inputObject)
		expect(unwrappedObject).toBeInstanceOf(Test)
		expect(unwrappedObject.getI()).toEqual(123)
		expect(factoryCalled).toBe(true)
	})

	test('decimal normalization and structure', () => {
		const val = Value.from(Decimal.parse('15.2300'))
		const d = expectCase(val.proto(), 'decimalValue')

		expect(d.exponent).toBe(-2)
		// coefficient should be 1523 (sign + digits)
		const coeffAbs = bytesToBigIntBE(d.coefficient!.absVal)
		expect(d.coefficient!.sign).toBe(1n)
		expect(coeffAbs).toBe(1523n)

		const unwrapped = val.unwrap()
		expect(unwrapped).toEqual(new Decimal(1523n, -2))
	})

	test('decimal negative and integer only', () => {
		const val = Value.from(Decimal.parse('-123.4500'))

		const d = expectCase(val.proto(), 'decimalValue')
		expect(d.exponent).toBe(-2)
		expect(d.coefficient!.sign).toBe(-1n)
		const coeffAbs = bytesToBigIntBE(d.coefficient!.absVal)
		expect(coeffAbs).toBe(12345n)

		const unwrapped = val.unwrap()
		expect(unwrapped).toEqual(new Decimal(-12345n, -2))

		const intString = '42'
		const i = Value.from(Decimal.parse(intString))

		const id = expectCase(i.proto(), 'decimalValue')
		expect(id.exponent).toBe(0)
		expect(bytesToBigIntBE(id.coefficient!.absVal)).toBe(42n)

		const iunwrapped = i.unwrap()
		expect(iunwrapped).toEqual(new Decimal(42n, 0))
	})

	test('decimal invalid strings throw', () => {
		expect(() => Value.from(Decimal.parse('abc'))).toThrow()
		expect(() => Value.from(Decimal.parse('1.'))).toThrow()
		expect(() => Value.from(Decimal.parse('.5'))).toThrow()
	})

	test('from throws on null/undefined', () => {
		expect(() => Value.from(null as unknown as string)).toThrow()
		expect(() => Value.from(undefined as unknown as string)).toThrow()
	})

	test('non value protos', () => {
		// An proto that isn't related to values
		const fieldMask = create(FieldMaskSchema, {
			paths: ['user.displayName', 'user.email', 'posts.*.title'],
		})

		const val = Value.from(fieldMask)

		const mapValue = expectCase(val.proto(), 'mapValue').fields
		expect(Object.keys(mapValue)).toContain('$typeName')
		expect(Object.keys(mapValue)).toContain('paths')

		// Check that the typeName was preserved
		expectProto(mapValue['$typeName'], { case: 'stringValue', value: 'google.protobuf.FieldMask' })

		const pathsList = expectCase(mapValue['paths'], 'listValue').fields
		expect(pathsList).toHaveLength(3)
		expectProto(pathsList[0], { case: 'stringValue', value: 'user.displayName' })
		expectProto(pathsList[1], { case: 'stringValue', value: 'user.email' })
		expectProto(pathsList[2], { case: 'stringValue', value: 'posts.*.title' })

		// Test unwrap to plain object
		const unwrapped = val.unwrap() as Record<string, unknown>
		expect(unwrapped.$typeName).toBe('google.protobuf.FieldMask')
		expect(Array.isArray(unwrapped.paths)).toBe(true)
		expect(unwrapped.paths).toEqual(['user.displayName', 'user.email', 'posts.*.title'])

		const directProto = val.unwrapToType({
			factory: () => create(FieldMaskSchema),
		})

		// Verify this approach also works
		expect(directProto.$typeName).toBe('google.protobuf.FieldMask')
		expect(directProto.paths).toEqual(['user.displayName', 'user.email', 'posts.*.title'])
	})
})
