import { create } from "@bufbuild/protobuf";
import type {
  ConsensusDescriptor,
  SimpleConsensusInputs,
} from "@cre/generated/sdk/v1alpha/sdk_pb";
import type { Value } from "@cre/generated/values/v1/values_pb";
import {
  AggregationType,
  ConsensusDescriptorSchema,
  FieldsMapSchema,
  SimpleConsensusInputsSchema,
} from "@cre/generated/sdk/v1alpha/sdk_pb";

export { AggregationType } from "@cre/generated/sdk/v1alpha/sdk_pb";

const consensusAggregators = [
  "median",
  "identical",
  "commonPrefix",
  "commonSuffix",
] as const;
export type ConsenusAggregator = (typeof consensusAggregators)[number];

export const consensusDescriptorMedian = create(ConsensusDescriptorSchema, {
  descriptor: {
    case: "aggregation",
    value: AggregationType.MEDIAN,
  },
});

export const consensusDescriptorIdentical = create(ConsensusDescriptorSchema, {
  descriptor: {
    case: "aggregation",
    value: AggregationType.IDENTICAL,
  },
});

export const consensusDescriptorCommonPrefix = create(
  ConsensusDescriptorSchema,
  {
    descriptor: {
      case: "aggregation",
      value: AggregationType.COMMON_PREFIX,
    },
  }
);

export const consensusDescriptorCommonSuffix = create(
  ConsensusDescriptorSchema,
  {
    descriptor: {
      case: "aggregation",
      value: AggregationType.COMMON_SUFFIX,
    },
  }
);

const consensusAggregatorsMap = {
  median: consensusDescriptorMedian,
  identical: consensusDescriptorIdentical,
  commonPrefix: consensusDescriptorCommonPrefix,
  commonSuffix: consensusDescriptorCommonSuffix,
} as const;

export const createConsensusDescriptorAggregation = (
  aggregation: AggregationType
) =>
  create(ConsensusDescriptorSchema, {
    descriptor: {
      case: "aggregation",
      value: aggregation,
    },
  });

export const consensusFields = (fields: Record<string, ConsensusDescriptor>) =>
  create(ConsensusDescriptorSchema, {
    descriptor: {
      case: "fieldsMap",
      value: create(FieldsMapSchema, { fields }),
    },
  });

/**
 * Creates a consensus fields descriptor from a mixed specification of aggregation types and descriptors.
 *
 * This function normalizes a mixed object where values can be either:
 * - `AggregationType` enum values (numbers) - automatically converted to consensus descriptors
 * - `ConsensusDescriptor` objects - used as-is
 *
 * @param spec - Object mapping field names to either AggregationType enum values or ConsensusDescriptor objects
 * @returns A ConsensusDescriptor with a fieldsMap containing the normalized field descriptors
 *
 * @example
 * ```typescript
 * // Using AggregationType enum values (most common usage)
 * const descriptors = consensusFieldsFrom({
 *   "Price": AggregationType.MEDIAN,
 *   "Volume": AggregationType.IDENTICAL
 * });
 *
 * @example
 * ```typescript
 * // Mixed usage with pre-built descriptors
 * const prebuilt = createConsensusDescriptorAggregation(AggregationType.COMMON_PREFIX);
 * const descriptors = consensusFieldsFrom({
 *   "Foo": AggregationType.MEDIAN,
 *   "Bar": AggregationType.IDENTICAL,
 *   "Baz": prebuilt // Reuse pre-built descriptor
 * });
 *
 * @example
 * ```typescript
 * // Nested field maps for complex consensus structures
 * const nested = consensusFieldsFrom({
 *   "OuterField": consensusFieldsFrom({
 *     "InnerField": AggregationType.MEDIAN
 *   })
 * });
 *
 * @example
 * ```typescript
 * // Real-world usage in workflow consensus inputs
 * const consensusInput = create(SimpleConsensusInputsSchema, {
 *   observation: observationValue(val.mapValue({
 *     Foo: val.int64(response.fooValue),
 *     Bar: val.int64(response.barValue),
 *     Baz: val.string(response.bazValue)
 *   })),
 *   descriptors: consensusFieldsFrom({
 *     Foo: AggregationType.MEDIAN,
 *     Bar: AggregationType.IDENTICAL,
 *     Baz: AggregationType.COMMON_PREFIX,
 *   }),
 *   default: val.mapValue({
 *     Foo: val.int64(42),
 *     Bar: val.int64(123),
 *     Baz: val.string("default"),
 *   }),
 * });
 * ```
 */
export const consensusFieldsFrom = (
  spec: Record<string, ConsensusDescriptor | AggregationType>
) => {
  const normalized: Record<string, ConsensusDescriptor> = {};
  for (const key of Object.keys(spec)) {
    const value = spec[key];
    normalized[key] =
      typeof value === "number"
        ? createConsensusDescriptorAggregation(value)
        : value;
  }
  return consensusFields(normalized);
};

export type ObservationValueCase = Extract<
  SimpleConsensusInputs["observation"],
  { case: "value" }
>;

export type ObservationErrorCase = Extract<
  SimpleConsensusInputs["observation"],
  { case: "error" }
>;

export const observationValue = (value: Value): ObservationValueCase => ({
  case: "value",
  value,
});

export const observationError = (message: string): ObservationErrorCase => ({
  case: "error",
  value: message,
});

/**
 * Creates consensus inputs for oracle network data aggregation.
 *
 * This function prepares an individual observation for distributed consensus
 * among multiple oracle nodes. Each consensus strategy aggregates observations
 * differently to produce a single trusted result.
 *
 * **Note**: This function only handles single values with a single consensus strategy.
 * For complex objects with multiple fields using different consensus strategies,
 * use `consensusFieldsFrom` directly with `create(SimpleConsensusInputsSchema, ...)`.
 *
 * @param value - The observation value from this oracle node
 * @param consensus - The consensus mechanism to use for aggregation:
 *   - `"median"` - Takes middle value when sorted (ideal for numerical data, like prices)
 *   - `"identical"` - Requires all nodes to report exact same value (for critical boolean/status data)
 *   - `"commonPrefix"` - Finds longest shared beginning of strings (useful for URLs/addresses)
 *   - `"commonSuffix"` - Finds longest shared ending of strings
 * @returns SimpleConsensusInputs object containing the observation and consensus descriptor
 *
 * @example
 * ```typescript
 * // Price feed - use median to resist outliers
 * const priceInput = getAggregatedValue(val.float64(1850.50), "median");
 *
 * // System status - require exact consensus
 * const statusInput = getAggregatedValue(val.bool(true), "identical");
 *
 * // API endpoint - find common base URL
 * const urlInput = getAggregatedValue(val.string("https://api.example.com/v1/data"), "commonPrefix");
 *
 * // For complex multi-field consensus, use consensusFieldsFrom instead:
 * // const complexInput = create(SimpleConsensusInputsSchema, {
 * //   observation: observationValue(val.mapValue({ Foo: val.int64(42), Bar: val.string("test") })),
 * //   descriptors: consensusFieldsFrom({
 * //     Foo: AggregationType.MEDIAN,
 * //     Bar: AggregationType.IDENTICAL,
 * //   }),
 * // });
 * ```
 */
export const getAggregatedValue = (
  value: Value,
  consensus: ConsenusAggregator
) =>
  create(SimpleConsensusInputsSchema, {
    observation: observationValue(value),
    descriptors: consensusAggregatorsMap[consensus],
  });
