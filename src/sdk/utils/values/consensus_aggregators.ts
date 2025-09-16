import { AggregationType, ConsensusDescriptorSchema, FieldsMapSchema, type ConsensusDescriptor, type FieldsMap } from "@cre/generated/sdk/v1alpha/sdk_pb";
import { create } from "@bufbuild/protobuf";
import type { CreSerializable, NumericType, TypeVerifier } from "./serializer_types";

export type ConsensusAggregation<T, U> = {
	readonly descriptor: ConsensusDescriptor
	readonly defaultValue?: T
	withDefault(t: T): ConsensusAggregation<T, U>
	_usesUToForceShape(u: U): void
}
// Maybe make ConsensusAggregation take a second parameter, and it'll be true or false, then make anything using it require true
// Only take one type, but make the return type ConsensusAggregation<T, TypeVerifier<T, CreSerializable<T>>
// Similar for fields, but ignore would always return ConsensusAggregationFields<T, true> instead of ConsensusAggregationFields<T, CreSerializable<T>>, and so would ConsensusAggregationByFields :D

export function consensusMedianAggregation<T extends NumericType>(): ConsensusAggregation<T, TypeVerifier<T, CreSerializable<T>>> {
	return simpleConsensus(AggregationType.MEDIAN)
}

export function consensusIdenticalAggregation<T>(): ConsensusAggregation<T, TypeVerifier<T, CreSerializable<T>>> {
	return simpleConsensus(AggregationType.IDENTICAL)
}

export function consensusCommonPrefixAggregation<T>(): ConsensusAggregation<T[], TypeVerifier<T[], CreSerializable<T[]>>> {
	return simpleConsensus<T[]>(AggregationType.COMMON_PREFIX)
}

export function consensusCommonSuffixAggregation<T>(): ConsensusAggregation<T[], TypeVerifier<T[], CreSerializable<T[]>>> {
	return simpleConsensus <T[]>(AggregationType.COMMON_SUFFIX)
}

class ConsensusImpl<T, U> implements ConsensusAggregation<T, U> {
	constructor(readonly descriptor: ConsensusDescriptor, readonly defaultValue?: T) {}
	withDefault(t: T): ConsensusAggregation<T, U> {
		return new ConsensusImpl(this.descriptor, t)
	}
	_usesUToForceShape(_: U): void{}
}

function simpleConsensus<T>(agg: AggregationType): ConsensusAggregation<T, TypeVerifier<T, CreSerializable<T>>> {
	return new ConsensusImpl<T, TypeVerifier<T, CreSerializable<T>>>(simpleDescriptor(agg))
}

function simpleDescriptor(agg: AggregationType): ConsensusDescriptor {
	return create(ConsensusDescriptorSchema, {
		descriptor: {
			case: 'aggregation',
			value: agg
		}
	})
}

export function median<T extends NumericType>(): ConsensusFieldAggregation<T, true> {
	return new ConsensusFieldAggregation<T, true>(simpleDescriptor(AggregationType.MEDIAN))
}

// identical requires the type twice due to limitations in circular references in TypeScripts validation system.
export function identical<T>(): ConsensusFieldAggregation<T, TypeVerifier<T, CreSerializable<T>>> {
	return new ConsensusFieldAggregation(simpleDescriptor(AggregationType.IDENTICAL))
}

export function commonPrefix<T>(): ConsensusFieldAggregation<T[], TypeVerifier<T[], CreSerializable<T[]>>> {
	return new ConsensusFieldAggregation(simpleDescriptor(AggregationType.COMMON_PREFIX))
}

export function commonSuffix<T>(): ConsensusFieldAggregation<T[], TypeVerifier<T[], CreSerializable<T[]>>> {
	return new ConsensusFieldAggregation(simpleDescriptor(AggregationType.COMMON_SUFFIX))
}

export function ignore<T>(): ConsensusFieldAggregation<T, true> {
	return new ConsensusFieldAggregation()
}

export class ConsensusFieldAggregation<T, U> {
	// t and u are included in the constructor to force the shape of ConsensusFieldAggregation to include them.
	// This disallows automatic casting from other ConsensusFieldAggregation types.
	constructor(public fieldDescriptor?: ConsensusDescriptor, protected readonly t?: T, protected readonly u?: U) { }
}

export type ConsensusAggregationFields<T extends object> = { [K in keyof T]: () => ConsensusFieldAggregation<T[K], true> }

export function ConsensusAggregationByFields<T extends object>(aggregation: ConsensusAggregationFields<T>): ConsensusAggregation<T, true> {
	const fieldMap = create(FieldsMapSchema)
	
	Object.keys(aggregation).forEach(key => {
		const fieldFn = aggregation[key as keyof T]
		const fieldAggregation = fieldFn()
		if (fieldAggregation.fieldDescriptor) {
			fieldMap.fields[key] = fieldAggregation.fieldDescriptor
		}
	})
	
	return new ConsensusImpl<T, true>(create(ConsensusDescriptorSchema, {
		descriptor: {
			case: 'fieldsMap',
			value: fieldMap
		}
	}))
}