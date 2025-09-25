import { describe, test } from 'bun:test'
import type {
	CreSerializable,
	CreSerializableNested,
	NonSerializable,
	NumericType,
	PrimitiveTypes,
	TypeVerifier,
} from './serializer_types'
import type { Decimal, Int64, UInt64, Value } from './value'

// These tests verify types are set up correctly.
// The compilation itself is enough to validate it is correct, but it's broken into tests to make it easier to see what is tested.
// Each path in a type is tested at laest once, in order of their occurence
// False values are meant to demonstrate the constraints, but cannot be exaustive, for each type check, there's one false to capture it.
describe('test types', () => {
	test('NumericType', () => {
		verifyType<number, NumericType>(true)
		verifyType<bigint, NumericType>(true)
		verifyType<Date, NumericType>(true)
		verifyType<Int64, NumericType>(true)
		verifyType<UInt64, NumericType>(true)
		verifyType<Decimal, NumericType>(true)
		verifyType<string, NumericType>(false)
	})

	test('PrimitiveTypes', () => {
		verifyType<NumericType, PrimitiveTypes>(true)
		verifyType<boolean, PrimitiveTypes>(true)
		verifyType<string, PrimitiveTypes>(true)
		verifyType<RegExp, PrimitiveTypes>(false)
	})

	test('NonSerializable', () => {
		verifyType<null, NonSerializable>(true)
		verifyType<Map<any, any>, NonSerializable>(true)
		verifyType<Set<any>, NonSerializable>(true)
		verifyType<RegExp, NonSerializable>(true)
		verifyType<Int8Array, NonSerializable>(true)
		verifyType<string, NonSerializable>(false)
	})

	test('CreSerializableNested', () => {
		verifyType<PrimitiveTypes, CreSerializableNested<PrimitiveTypes>>(true)
		verifyType<number, CreSerializableNested<number>>(true)
		verifyType<
			(a: number, b: RegExp) => boolean,
			CreSerializableNested<(a: number, b: RegExp) => boolean>
		>(true)
		verifyType<() => void, CreSerializableNested<() => void>>(true)
		verifyType<NonSerializable, CreSerializableNested<NonSerializable>>(false)
		verifyType<Set<string>, CreSerializableNested<Set<string>>>(false)
		verifyType<number[], CreSerializableNested<number[]>>(true)
		verifyType<TestSerializableClass[], CreSerializableNested<TestSerializableClass[]>>(true)
		verifyType<TestSerializableClass, CreSerializableNested<TestSerializableClass>>(true)
		verifyType<TestSerializableInterface, CreSerializableNested<TestSerializableInterface>>(true)
		verifyType<TestSerializableType, CreSerializableNested<TestSerializableType>>(true)
		verifyType<
			TestSerializableClassPrivateNonSerializableMembers,
			CreSerializableNested<TestSerializableClassPrivateNonSerializableMembers>
		>(true)
		verifyType<Empty, CreSerializableNested<Empty>>(true)
		verifyType<Value, CreSerializableNested<Value>>(true)
		verifyType<RegExp, PrimitiveTypes>(false)
		verifyType<TestNonSerializableClass, CreSerializableNested<TestNonSerializableClass>>(false)
		verifyType<TestNonSerializableClass, CreSerializableNested<TestNonSerializableType>>(false)
		verifyType<TestNonSerializableInterface, CreSerializableNested<TestNonSerializableInterface>>(
			false,
		)
		verifyType<TestNonSerializableClass[], CreSerializableNested<TestNonSerializableClass[]>>(false)
	})

	test('CreSerializable', () => {
		verifyType<PrimitiveTypes, CreSerializable<PrimitiveTypes>>(true)
		verifyType<number, CreSerializable<number>>(true)
		verifyType<
			(a: number, b: RegExp) => boolean,
			CreSerializable<(a: number, b: RegExp) => boolean>
		>(false)
		verifyType<() => void, CreSerializable<() => void>>(false)
		verifyType<NonSerializable, CreSerializable<NonSerializable>>(false)
		verifyType<Set<string>, CreSerializable<Set<string>>>(false)
		verifyType<number[], CreSerializable<number[]>>(true)
		verifyType<TestSerializableClass[], CreSerializable<TestSerializableClass[]>>(true)
		verifyType<TestSerializableClass, CreSerializable<TestSerializableClass>>(true)
		verifyType<TestSerializableInterface, CreSerializable<TestSerializableInterface>>(true)
		verifyType<TestSerializableType, CreSerializable<TestSerializableType>>(true)
		verifyType<
			TestSerializableClassPrivateNonSerializableMembers,
			CreSerializable<TestSerializableClassPrivateNonSerializableMembers>
		>(true)
		verifyType<Empty, CreSerializable<Empty>>(true)
		verifyType<Value, CreSerializable<Value>>(true)
		verifyType<RegExp, PrimitiveTypes>(false)
		verifyType<TestNonSerializableClass, CreSerializable<TestNonSerializableClass>>(false)
		verifyType<TestNonSerializableClass, CreSerializable<TestNonSerializableType>>(false)
		verifyType<TestNonSerializableInterface, CreSerializable<TestNonSerializableInterface>>(false)
		verifyType<TestNonSerializableClass[], CreSerializable<TestNonSerializableClass[]>>(false)
	})
})

class Empty {}

class TestSerializableClass {
	constructor(
		public a: string,
		public b: () => RegExp,
	) {}
	foo(): boolean {
		return false
	}
}

interface TestSerializableInterface {
	a: string
	foo(): boolean
}

type TestSerializableType = {
	a: string
	foo(): boolean
}

class TestSerializableClassPrivateNonSerializableMembers {
	constructor(
		public a: string,
		private b: RegExp,
		private readonly c: RegExp,
	) {}
}

class TestNonSerializableClass {
	constructor(public a: RegExp) {}
}

interface TestNonSerializableInterface {
	a: RegExp
}

type TestNonSerializableType = {
	a: RegExp
}

function verifyType<T, U>(isType: TypeVerifier<T, U>): boolean {
	return isType
}
