import { cre } from "@cre/sdk/cre";
import {
  type ConsenusAggregator,
  getAggregatedValue,
} from "@cre/sdk/utils/values/consensus";
import { type SupportedValueTypes, val } from "@cre/sdk/utils/values/value";

// ===== TYPE HELPERS FOR BETTER TYPE SAFETY =====

// Map value types to their expected input types
type ValueTypeInput = {
  string: string;
  float64: number;
  int64: number | bigint | string;
  bigint: bigint;
  bool: boolean;
  bytes: Uint8Array | ArrayBuffer;
  time: Date | number | string;
  list: Array<unknown>;
  mapValue: Record<string, unknown>;
  decimal: string;
  from: unknown;
};

// ===== CORE CONSENSUS WRAPPER =====

/**
 * Core consensus wrapper with strong typing
 * Ensures the function return type matches the value type input requirements
 */
export const useConsensus = <
  TValueType extends keyof ValueTypeInput & SupportedValueTypes,
  TArgs extends readonly any[],
  TReturn extends ValueTypeInput[TValueType]
>(
  fn: (...args: TArgs) => Promise<TReturn>,
  valueType: TValueType,
  aggregationType: ConsenusAggregator
) => {
  return async (...args: TArgs): Promise<any> => {
    return cre.runInNodeMode(async () => {
      const result = await fn(...args);
      return getAggregatedValue(
        (val as any)[valueType](result),
        aggregationType
      );
    });
  };
};

// ===== TYPED CONVENIENCE WRAPPERS =====

/**
 * Median consensus for numerical data
 * Automatically infers correct return type based on value type
 */
export const useMedianConsensus = <TArgs extends readonly any[]>(
  fn: (...args: TArgs) => Promise<number>,
  valueType: "float64" | "int64" = "float64"
) => useConsensus(fn, valueType, "median");

/**
 * Identical consensus - all nodes must agree exactly
 * Supports any value type with proper typing
 */
export const useIdenticalConsensus = <
  TValueType extends keyof ValueTypeInput & SupportedValueTypes,
  TArgs extends readonly any[],
  TReturn extends ValueTypeInput[TValueType]
>(
  fn: (...args: TArgs) => Promise<TReturn>,
  valueType: TValueType
) => useConsensus(fn, valueType, "identical");

/**
 * Common prefix consensus for strings and bytes
 */
export const useCommonPrefixConsensus = <
  TValueType extends ("string" | "bytes") & keyof ValueTypeInput,
  TArgs extends readonly any[],
  TReturn extends ValueTypeInput[TValueType]
>(
  fn: (...args: TArgs) => Promise<TReturn>,
  valueType: TValueType
) => useConsensus(fn, valueType, "commonPrefix");

/**
 * Common suffix consensus for strings and bytes
 */
export const useCommonSuffixConsensus = <
  TValueType extends ("string" | "bytes") & keyof ValueTypeInput,
  TArgs extends readonly any[],
  TReturn extends ValueTypeInput[TValueType]
>(
  fn: (...args: TArgs) => Promise<TReturn>,
  valueType: TValueType
) => useConsensus(fn, valueType, "commonSuffix");
