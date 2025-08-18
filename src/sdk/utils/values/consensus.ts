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
} from "@cre/generated/sdk/v1alpha/sdk_pb";

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
