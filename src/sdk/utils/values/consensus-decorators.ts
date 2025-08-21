import { cre } from "@cre/sdk/cre";
import {
  type ConsenusAggregator,
  getAggregatedValue,
} from "@cre/sdk/utils/values/consensus";
import { type SupportedValueTypes, val } from "@cre/sdk/utils/values/value";

export const useConsensus = <TReturn>(
  valueType: SupportedValueTypes,
  aggregationType: ConsenusAggregator
) => {
  return <T extends (...args: any[]) => Promise<TReturn>>(
    _target: any,
    _propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
  ) => {
    const originalMethod = descriptor.value!;

    descriptor.value = async function (this: any, ...args: Parameters<T>) {
      return cre.runInNodeMode(async () => {
        const result = await originalMethod.apply(this, args);
        return getAggregatedValue(
          (val as any)[valueType](result),
          aggregationType
        );
      });
    } as T;

    return descriptor;
  };
};

// Convenience decorators for common consensus patterns

// Median consensus - typically for numerical data
export const useMedianConsensus = (
  valueType: "float64" | "int64" | "bigint" = "float64"
) => useConsensus(valueType, "median");

// Identical consensus - all nodes must agree exactly
export const useIdenticalConsensus = (
  valueType: SupportedValueTypes = "string"
) => useConsensus(valueType, "identical");

// Common prefix consensus - find longest shared beginning
export const useCommonPrefixConsensus = (
  valueType: "string" | "bytes" = "string"
) => useConsensus(valueType, "commonPrefix");

// Common suffix consensus - find longest shared ending
export const useCommonSuffixConsensus = (
  valueType: "string" | "bytes" = "string"
) => useConsensus(valueType, "commonSuffix");
