import { describe, expect, test } from "bun:test";
import { AggregationType } from "@cre/generated/sdk/v1alpha/sdk_pb";
import type { ConsensusDescriptor } from "@cre/generated/sdk/v1alpha/sdk_pb";
import {
  consensusDescriptorMedian,
  consensusDescriptorIdentical,
  consensusDescriptorCommonPrefix,
  consensusDescriptorCommonSuffix,
  createConsensusDescriptorAggregation,
  consensusFields,
  consensusFieldsFrom,
  observationValue,
  observationError,
} from "./consensus";
import { val } from "./value";

const getAggregation = (d: ConsensusDescriptor): AggregationType | undefined =>
  d.descriptor.case === "aggregation" ? d.descriptor.value : undefined;

const isFieldsMap = (d: ConsensusDescriptor): boolean =>
  d.descriptor.case === "fieldsMap";

describe("consensus helpers", () => {
  test("aggregation helpers", () => {
    expect(getAggregation(consensusDescriptorMedian)).toBe(
      AggregationType.MEDIAN
    );
    expect(getAggregation(consensusDescriptorIdentical)).toBe(
      AggregationType.IDENTICAL
    );
    expect(getAggregation(consensusDescriptorCommonPrefix)).toBe(
      AggregationType.COMMON_PREFIX
    );
    expect(getAggregation(consensusDescriptorCommonSuffix)).toBe(
      AggregationType.COMMON_SUFFIX
    );
  });

  test("createConsensusDescriptorAggregation", () => {
    const d = createConsensusDescriptorAggregation(AggregationType.IDENTICAL);
    expect(getAggregation(d)).toBe(AggregationType.IDENTICAL);
  });

  test("consensusFields builds fieldsMap", () => {
    const fields: Record<string, ConsensusDescriptor> = {
      Price: createConsensusDescriptorAggregation(AggregationType.MEDIAN),
    };
    const d = consensusFields(fields);
    expect(isFieldsMap(d)).toBe(true);
    const map =
      d.descriptor.case === "fieldsMap" ? d.descriptor.value.fields : {};
    expect(Object.keys(map)).toEqual(["Price"]);
    expect(getAggregation(map.Price!)).toBe(AggregationType.MEDIAN);
  });

  test("consensusFieldsFrom normalizes enums and descriptors", () => {
    const prebuilt = createConsensusDescriptorAggregation(
      AggregationType.IDENTICAL
    );
    const d = consensusFieldsFrom({
      a: AggregationType.MEDIAN,
      b: prebuilt,
    });
    expect(isFieldsMap(d)).toBe(true);
    const map =
      d.descriptor.case === "fieldsMap" ? d.descriptor.value.fields : {};
    expect(getAggregation(map.a!)).toBe(AggregationType.MEDIAN);
    expect(getAggregation(map.b!)).toBe(AggregationType.IDENTICAL);
  });

  test("consensusFieldsFrom nested fieldsMap", () => {
    const nested = consensusFieldsFrom({
      In: consensusFieldsFrom({ Score: AggregationType.MEDIAN }),
    });
    expect(isFieldsMap(nested)).toBe(true);
    const outer =
      nested.descriptor.case === "fieldsMap"
        ? nested.descriptor.value.fields
        : {};
    const inner = outer.In!;
    expect(isFieldsMap(inner)).toBe(true);
    const innerFields =
      inner.descriptor.case === "fieldsMap"
        ? inner.descriptor.value.fields
        : {};
    expect(getAggregation(innerFields.Score!)).toBe(AggregationType.MEDIAN);
  });

  test("observation helpers", () => {
    const ov = observationValue(val.string("ok"));
    expect(ov.case).toBe("value");
    expect(ov.value.value.case).toBe("stringValue");

    const oe = observationError("boom");
    expect(oe.case).toBe("error");
    expect(oe.value).toBe("boom");
  });
});
