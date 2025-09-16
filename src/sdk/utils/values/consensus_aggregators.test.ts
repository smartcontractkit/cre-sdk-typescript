import { describe, expect, test } from 'bun:test'
import { commonPrefix, commonSuffix, ConsensusAggregationByFields, consensusCommonPrefixAggregation, consensusCommonSuffixAggregation, type ConsensusFieldAggregation, consensusIdenticalAggregation, consensusMedianAggregation, identical, ignore, median, type ConsensusAggregation } from './consensus_aggregators'
import { AggregationType, type ConsensusDescriptor } from '@cre/generated/sdk/v1alpha/sdk_pb'

// Similar to the tests for serialization, there are portions of the tests to verify that the retuned type is correct.
// The compilation itself is enough to validate it is correct, but it's broken into tests to make it easier to see what is tested.
// Since CreSerializable is tested in depth in the serializer tests, tests in this file only verify one invalid type. 
describe('test consensus', () => {
    test('median', () => {
        assertSimpleConsensus(consensusMedianAggregation<number>(), AggregationType.MEDIAN)
        usableForConsensus<number, true>(consensusMedianAggregation<number>())
        usableForConsensus<bigint, true>(consensusMedianAggregation<bigint>())
        usableForConsensus<Date, true>(consensusMedianAggregation<Date>())
        // Restrictions on consensusMedianAggregation won't allow other types
    })

    test('identical', () => { 
        assertSimpleConsensus(consensusIdenticalAggregation<number>(), AggregationType.IDENTICAL)
        usableForConsensus<number, true>(consensusIdenticalAggregation<number>())
        usableForConsensus<bigint, true>(consensusIdenticalAggregation<bigint>())
        usableForConsensus<Date, true>(consensusIdenticalAggregation<Date>())
        usableForConsensus<string, true>(consensusIdenticalAggregation<string>())
        usableForConsensus<boolean, true>(consensusIdenticalAggregation<boolean>())
        usableForConsensus<RegExp, false>(consensusIdenticalAggregation<RegExp>())
    })

    test('common prefix', () => {
        assertSimpleConsensus(consensusCommonPrefixAggregation<number>(), AggregationType.COMMON_PREFIX)
        usableForConsensus<number[], true>(consensusCommonPrefixAggregation())
        usableForConsensus<bigint[], true>(consensusCommonPrefixAggregation())
        usableForConsensus<Date[], true>(consensusCommonPrefixAggregation())
        usableForConsensus<string[], true>(consensusCommonPrefixAggregation())
        usableForConsensus<boolean[], true>(consensusCommonPrefixAggregation())
        usableForConsensus<RegExp[], false>(consensusCommonPrefixAggregation())
    })

    test('common prefix', () => {
        assertSimpleConsensus(consensusCommonSuffixAggregation<number>(), AggregationType.COMMON_SUFFIX)
        usableForConsensus<number[], true>(consensusCommonSuffixAggregation<number>())
        usableForConsensus<bigint[], true>(consensusCommonSuffixAggregation<bigint>())
        usableForConsensus<Date[], true>(consensusCommonSuffixAggregation<Date>())
        usableForConsensus<string[], true>(consensusCommonSuffixAggregation<string>())
        usableForConsensus<boolean[], true>(consensusCommonSuffixAggregation<boolean>())
        usableForConsensus<RegExp[], false>(consensusCommonSuffixAggregation<RegExp>())
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
            usableForFieldConsensus<number, true>(median)
            usableForFieldConsensus<bigint, true>(median)
            usableForFieldConsensus<Date, true>(median)
            // Restrictions on median won't allow other types
        })

        test('identical', () => {
            const consensusAggregation = ConsensusAggregationByFields<SimpleFieldType<string>>({
                f1: identical,
                f2: identical
            })
            assertFieldConsensus(consensusAggregation, AggregationType.IDENTICAL)

            usableForFieldConsensus<number, true>(identical)
            usableForFieldConsensus<bigint, true>(identical)
            usableForFieldConsensus<Date, true>(identical)
            usableForFieldConsensus<string, true>(identical)
            usableForFieldConsensus<boolean, true>(identical)
            usableForFieldConsensus<RegExp, false>(identical)
         })
        
        test('common prefix', () => {
            const consensusAggregation = ConsensusAggregationByFields<SimpleFieldType<number[]>>({
                f1: commonPrefix,
                f2: commonPrefix
            })
            assertFieldConsensus(consensusAggregation, AggregationType.COMMON_PREFIX)
            usableForFieldConsensus<number[], true>(commonPrefix)
            usableForFieldConsensus<bigint[], true>(commonPrefix)
            usableForFieldConsensus<Date[], true>(commonPrefix)
            usableForFieldConsensus<string[], true>(commonPrefix)
            usableForFieldConsensus<boolean[], true>(commonPrefix)
            usableForFieldConsensus<RegExp[], false>(commonPrefix)
        })

       test('common suffix', () => {
            const consensusAggregation = ConsensusAggregationByFields<SimpleFieldType<number[]>>({
                f1: commonSuffix,
                f2: commonSuffix
            })
           assertFieldConsensus(consensusAggregation, AggregationType.COMMON_SUFFIX)
           usableForFieldConsensus<number[], true>(commonSuffix)
            usableForFieldConsensus<bigint[], true>(commonSuffix)
            usableForFieldConsensus<Date[], true>(commonSuffix)
            usableForFieldConsensus<string[], true>(commonSuffix)
            usableForFieldConsensus<boolean[], true>(commonSuffix)
            usableForFieldConsensus<RegExp[], false>(commonSuffix)
       })

        test('ignore', () => {
            const consensusAggregation = ConsensusAggregationByFields<InvalidFieldType>({
                f1: identical,
                f2: identical,
                ignoreString: ignore,
                ignoreRegExp: ignore
            })
            assertFieldConsensus(consensusAggregation, AggregationType.IDENTICAL)
        })
    })
})

function assertSimpleConsensus<T>(c: ConsensusAggregation<T, true>, expected: AggregationType) {
    expect(c.defaultValue).toBeUndefined()
    const actual =  expectCase(c.descriptor, 'aggregation')
    expect(actual).toEqual(expected)
}

function assertFieldConsensus<T>(c: ConsensusAggregation<T, true>, expected: AggregationType) {
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

class InvalidFieldType {
    constructor(public f1: string, public f2: string, public ignoreString: string, public ignoreRegExp: RegExp) { }
}

function usableForConsensus<T, U>(a: ConsensusAggregation<T, U>): ConsensusAggregation<T, U> {
    return a
}

function usableForFieldConsensus<T, U>(a: () =>ConsensusFieldAggregation<T, U>): ()=> ConsensusFieldAggregation<T, U> {
    return a
}