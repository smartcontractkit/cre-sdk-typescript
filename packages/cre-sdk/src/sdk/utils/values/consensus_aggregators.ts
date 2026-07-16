import { create } from '@bufbuild/protobuf'
import {
	AggregationType,
	type ConsensusDescriptor,
	ConsensusDescriptorSchema,
	type FieldsMap,
	FieldsMapSchema,
} from '@cre/generated/sdk/v1alpha/sdk_pb'
import type { CreSerializable, NumericType, TypeVerifier } from './serializer_types'
import { Int64 } from './value'

export type ConsensusAggregation<TInput, TOutput, U> = {
	readonly descriptor: ConsensusDescriptor
	readonly defaultValue?: TInput
	withDefault(t: TInput): ConsensusAggregation<TInput, TOutput, U>
	_usesUToForceShape(u: U): void
}

export function consensusMedianAggregation<T extends NumericType>(): ConsensusAggregation<
	T,
	T,
	TypeVerifier<T, CreSerializable<T>>
> {
	return simpleConsensus(AggregationType.MEDIAN)
}

export function consensusIdenticalAggregation<T>(): ConsensusAggregation<
	T,
	T,
	TypeVerifier<T, CreSerializable<T>>
> {
	return simpleConsensus(AggregationType.IDENTICAL)
}

export function consensusCommonPrefixAggregation<T>(): ConsensusAggregation<
	T[],
	T[],
	TypeVerifier<T[], CreSerializable<T[]>>
> {
	return simpleConsensus<T[], T[]>(AggregationType.COMMON_PREFIX)
}

export function consensusCommonSuffixAggregation<T>(): ConsensusAggregation<
	T[],
	T[],
	TypeVerifier<T[], CreSerializable<T[]>>
> {
	return simpleConsensus<T[], T[]>(AggregationType.COMMON_SUFFIX)
}

export class FrequencyListEntry<T> {
	constructor(
		public value: T,
		public count: Int64,
	) {}
}

export function consensusFrequencyListAggregation<T>(): ConsensusAggregation<
	T[],
	FrequencyListEntry<T>[],
	TypeVerifier<T[], CreSerializable<T[]>>
> {
	return simpleConsensus<T[], FrequencyListEntry<T>[]>(AggregationType.FREQUENCY_LIST)
}

class ConsensusImpl<TInput, TOutput, U> implements ConsensusAggregation<TInput, TOutput, U> {
	constructor(
		readonly descriptor: ConsensusDescriptor,
		readonly defaultValue?: TInput,
	) {}
	withDefault(t: TInput): ConsensusAggregation<TInput, TOutput, U> {
		return new ConsensusImpl(this.descriptor, t)
	}
	_usesUToForceShape(_: U): void {}
}

function simpleConsensus<TInput, TOutput = TInput>(
	agg: AggregationType,
): ConsensusAggregation<TInput, TOutput, TypeVerifier<TInput, CreSerializable<TInput>>> {
	return new ConsensusImpl<TInput, TOutput, TypeVerifier<TInput, CreSerializable<TInput>>>(
		simpleDescriptor(agg),
	)
}

function simpleDescriptor(agg: AggregationType): ConsensusDescriptor {
	return create(ConsensusDescriptorSchema, {
		descriptor: {
			case: 'aggregation',
			value: agg,
		},
	})
}

export function median<T extends NumericType>(): ConsensusFieldAggregation<T, true> {
	return new ConsensusFieldAggregation<T, true>(simpleDescriptor(AggregationType.MEDIAN))
}

// identical requires the type twice due to limitations in circular references in TypeScripts validation system.
export function identical<T>(): ConsensusFieldAggregation<T, TypeVerifier<T, CreSerializable<T>>> {
	return new ConsensusFieldAggregation(simpleDescriptor(AggregationType.IDENTICAL))
}

export function commonPrefix<T>(): ConsensusFieldAggregation<
	T[],
	TypeVerifier<T[], CreSerializable<T[]>>
> {
	return new ConsensusFieldAggregation(simpleDescriptor(AggregationType.COMMON_PREFIX))
}

export function commonSuffix<T>(): ConsensusFieldAggregation<
	T[],
	TypeVerifier<T[], CreSerializable<T[]>>
> {
	return new ConsensusFieldAggregation(simpleDescriptor(AggregationType.COMMON_SUFFIX))
}

export function frequencyList<T>(): ConsensusFieldAggregation<
	T,
	TypeVerifier<T, CreSerializable<T>>
> {
	return new ConsensusFieldAggregation(simpleDescriptor(AggregationType.FREQUENCY_LIST))
}

export function ignore<T>(): ConsensusFieldAggregation<T, true> {
	return new ConsensusFieldAggregation()
}

export class ConsensusFieldAggregation<T, U> {
	// t and u are included in the constructor to force the shape of ConsensusFieldAggregation to include them.
	// This disallows automatic casting from other ConsensusFieldAggregation types.
	constructor(
		public fieldDescriptor?: ConsensusDescriptor,
		protected readonly t?: T,
		protected readonly u?: U,
	) {}
}

export type ConsensusAggregationFields<T extends object> = {
	[K in keyof T as K extends '$typeName' ? never : K]: () => ConsensusFieldAggregation<T[K], true>
}

// TOutput lets the consensus result type differ from the observed input type. It defaults to T
// (most field aggregators return the same shape they consume), but aggregators that reshape a
// field — e.g. `frequencyList`, which turns a field of type F into FrequencyListEntry<F>[] —
// change the result. Pass TOutput explicitly in that case so `.result()` is typed correctly
// instead of forcing callers to cast (`.result() as unknown as ...`).
export function ConsensusAggregationByFields<T extends object, TOutput = T>(
	aggregation: ConsensusAggregationFields<T>,
): ConsensusAggregation<T, TOutput, true> {
	const fieldMap = create(FieldsMapSchema)

	Object.keys(aggregation).forEach((key) => {
		const fieldFn = aggregation[key as keyof ConsensusAggregationFields<T>]
		const fieldAggregation = fieldFn()
		if (fieldAggregation.fieldDescriptor) {
			fieldMap.fields[key] = fieldAggregation.fieldDescriptor
		}
	})

	return new ConsensusImpl<T, TOutput, true>(
		create(ConsensusDescriptorSchema, {
			descriptor: {
				case: 'fieldsMap',
				value: fieldMap,
			},
		}),
	)
}
