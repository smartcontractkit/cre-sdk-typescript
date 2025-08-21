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
