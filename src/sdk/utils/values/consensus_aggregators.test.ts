import { describe, expect, test } from 'bun:test'
import { ConsensusAggregationByFields, consensusCommonPrefixAggregation, consensusCommonSuffixAggregation, consensusIdenticalAggregation, consensusMedianAggregation, median, type ConsensusAggregation } from './consensus_aggregators'
import { AggregationType, type ConsensusDescriptor } from '@cre/generated/sdk/v1alpha/sdk_pb'

describe('test consensus', () => {
    test('median', () => {
        assertSimpleConsensus(consensusMedianAggregation<number>(), AggregationType.MEDIAN)
    })

    test('identical', () => { 
        assertSimpleConsensus(consensusIdenticalAggregation<number, number>(), AggregationType.IDENTICAL)
    })

    test('common prefix', () => {
        assertSimpleConsensus(consensusCommonPrefixAggregation<number, number>(), AggregationType.COMMON_PREFIX)
    })

    test('common prefix', () => {
        assertSimpleConsensus(consensusCommonSuffixAggregation<number, number>(), AggregationType.COMMON_SUFFIX)
    })

    test('with default adds default', () => {
        const original = consensusMedianAggregation<number>()
        const anyDefaultValue = 10
        const withDefault = original.withDefault(anyDefaultValue)

        expect(original.defaultValue).toBeUndefined()
        expect(withDefault.descriptor).toEqual(original.descriptor)
        expect(withDefault.defaultValue).toEqual(anyDefaultValue)
    })

    test('with default overrides default', () => {
        const anyDefaultValue = 10
        const original = consensusMedianAggregation<number>().withDefault(anyDefaultValue)
        const anyDifferentDefaultValue = anyDefaultValue + 20
        const withDefault = original.withDefault(anyDifferentDefaultValue)
        
        expect(original.defaultValue).toEqual(anyDefaultValue)
        expect(withDefault.descriptor).toEqual(original.descriptor)
        expect(withDefault.defaultValue).toEqual(anyDifferentDefaultValue)
    })

    describe('test fields', () => {
        test('median', () => {
            const consensusAggregation = ConsensusAggregationByFields<SimpleFieldType<number>>({
                f1: median,
                f2: median
            })
            assertFieldConsensus(consensusAggregation, AggregationType.MEDIAN)
        })
    })
})

function assertSimpleConsensus<T>(c: ConsensusAggregation<T>, expected: AggregationType) {
    expect(c.defaultValue).toBeUndefined()
    const actual =  expectCase(c.descriptor, 'aggregation')
    expect(actual).toEqual(expected)
}

function assertFieldConsensus<T>(c: ConsensusAggregation<T>, expected: AggregationType) {
    expect(c.defaultValue).toBeUndefined()
    const actual = expectCase(c.descriptor, 'fieldsMap').fields
    const entries = Object.entries(actual)
    expect(entries).toHaveLength(2)
    
    expect(actual).toHaveProperty('f1')
    expect(actual).toHaveProperty('f2')
    
    const f1Descriptor = actual['f1']
    const f2Descriptor = actual['f2']
    
    expect(f1Descriptor.descriptor).toBeDefined()
    expect(f1Descriptor.descriptor.case).toBe('aggregation')
    expect(f1Descriptor.descriptor.value).toEqual(expected)
    
    expect(f2Descriptor.descriptor).toBeDefined()
    expect(f2Descriptor.descriptor.case).toBe('aggregation')
    expect(f2Descriptor.descriptor.value).toEqual(expected)
}

function expectCase<C extends NonNullable<ConsensusDescriptor['descriptor']['case']>, V = Extract<NonNullable<ConsensusDescriptor['descriptor']>, { case: C }>['value']>(
  actual: ConsensusDescriptor, 
  expectedCase: C
): V {
  expect(actual.descriptor).toBeDefined()
  expect(actual.descriptor.case).toBe(expectedCase)
  return actual.descriptor.value as V
}

class SimpleFieldType<T> {
    constructor(public f1: T, public f2: T) { }
}