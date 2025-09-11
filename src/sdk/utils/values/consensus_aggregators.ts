import { AggregationType, ConsensusDescriptorSchema, FieldsMapSchema, type ConsensusDescriptor, type FieldsMap } from "@cre/generated/sdk/v1alpha/sdk_pb";
import { create } from "@bufbuild/protobuf";
import type { CreSerializable, NumericType } from "./serializer_types";

export type ConsensusAggregation<T> = {
	readonly descriptor: ConsensusDescriptor
	readonly defaultValue?: T
	withDefault(t: T): ConsensusAggregation<T>
}

export function consensusMedianAggregation<T extends NumericType>(): ConsensusAggregation<T> {
	return simpleConsensus(AggregationType.MEDIAN)
}

// consensusIdenticalAggregation requires the type twice due to limitations in circular references in TypeScripts validation system.
export function consensusIdenticalAggregation<T extends {}, _ extends CreSerializable<T> & T>(): ConsensusAggregation<T> {
	return simpleConsensus(AggregationType.IDENTICAL)
}

// consensusCommonPrefixAggregation requires the type twice due to limitations in circular references in TypeScripts validation system.
export function consensusCommonPrefixAggregation<T extends {}, _ extends CreSerializable<T> & T>(): ConsensusAggregation<T[]> {
	return simpleConsensus(AggregationType.COMMON_PREFIX)
}

// consensusCommonSuffixAggregation requires the type twice due to limitations in circular references in TypeScripts validation system.
export function consensusCommonSuffixAggregation<T extends {}, _ extends CreSerializable<T> & T>(): ConsensusAggregation<T[]> {
	return simpleConsensus(AggregationType.COMMON_SUFFIX)
}

class ConsensusImpl<T> implements ConsensusAggregation<T> {
	constructor(readonly descriptor: ConsensusDescriptor, readonly defaultValue?: T) {}
	withDefault(t: T): ConsensusAggregation<T> {
		return new ConsensusImpl(this.descriptor, t)
	}
}

function simpleConsensus<T>(agg: AggregationType): ConsensusAggregation<T> {
	return new ConsensusImpl<T>(simpleDescriptor(agg))
}

function simpleDescriptor(agg: AggregationType): ConsensusDescriptor {
	return create(ConsensusDescriptorSchema, {
		descriptor: {
			case: 'aggregation',
			value: agg
		}
	})
}



export function median<T extends NumericType>(): ConsensusFieldAggregation<T> {
	return new ConsensusFieldAggregation<T>(simpleDescriptor(AggregationType.MEDIAN))
}

// identical requires the type twice due to limitations in circular references in TypeScripts validation system.
export function identical<T extends {}, _ extends CreSerializable<T> & T>(): ConsensusFieldAggregation<T> {
	return new ConsensusFieldAggregation(simpleDescriptor(AggregationType.IDENTICAL))
}

// commonPrefix requires the type twice due to limitations in circular references in TypeScripts validation system.
export function commonPrefix<T extends {}, _ extends CreSerializable<T> & T>(): ConsensusFieldAggregation<T[]> {
	return new ConsensusFieldAggregation(simpleDescriptor(AggregationType.COMMON_PREFIX))
}

// commonSuffix requires the type twice due to limitations in circular references in TypeScripts validation system.
export function commonSuffix<T extends {}, _ extends CreSerializable<T> & T>(): ConsensusFieldAggregation<T[]> {
	return new ConsensusFieldAggregation(simpleDescriptor(AggregationType.COMMON_SUFFIX))
}

export function ignore<T>(): ConsensusFieldAggregation<T> {
	return new ConsensusFieldAggregation(undefined)
}

export class ConsensusFieldAggregation<T> {
	constructor(public descriptor?: ConsensusDescriptor) { }
	private useTToRemoveWarning<T>(): T{ throw Error("should not be called...")}
}

export type ConsensusAggregationFields<T extends object> = { [K in keyof T]: () => ConsensusFieldAggregation<T[K]> }

export function ConsensusAggregationByFields<T extends object>(aggregation: ConsensusAggregationFields<T>): ConsensusAggregation<T> {
	const fieldMap = create(FieldsMapSchema)
	
	Object.keys(aggregation).forEach(key => {
		const fieldFn = aggregation[key as keyof T]
		const fieldAggregation = fieldFn()
		if (fieldAggregation.descriptor) {
			fieldMap.fields[key] = fieldAggregation.descriptor
		}
	})
	
	return new ConsensusImpl<T>(create(ConsensusDescriptorSchema, {
		descriptor: {
			case: 'fieldsMap',
			value: fieldMap
		}
	}))
}