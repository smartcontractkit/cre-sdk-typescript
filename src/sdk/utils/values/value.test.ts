import { describe, expect, test } from "bun:test";
import type { Value } from "@cre/generated/values/v1/values_pb";
import { toJson } from "@bufbuild/protobuf";
import { ValueSchema } from "@cre/generated/values/v1/values_pb";
import { val, vJson } from "./value";

const bytesToBigIntBE = (bytes: Uint8Array): bigint => {
  let out = 0n;
  for (const b of bytes) out = (out << 8n) + BigInt(b);
  return out;
};

const ensureCase = (v: Value, c: Value["value"]["case"]) => {
  if (v.value.case !== c)
    throw new Error(`expected case ${c} but got ${v.value.case}`);
  return v.value as any;
};

describe("val helpers", () => {
  test("string", () => {
    const v = val.string("hello");
    expect(v.value.case).toBe("stringValue");
    expect(v.value.value).toBe("hello");
  });

  test("bool", () => {
    const v = val.bool(true);
    expect(v.value.case).toBe("boolValue");
    expect(v.value.value).toBe(true);
  });

  test("bytes Uint8Array", () => {
    const data = new Uint8Array([1, 2, 3]);
    const v = val.bytes(data);
    expect(v.value.case).toBe("bytesValue");
    const bv = ensureCase(v, "bytesValue").value as Uint8Array;
    expect(Array.from(bv)).toEqual([1, 2, 3]);
  });

  test("bytes ArrayBuffer", () => {
    const ab = new Uint8Array([9, 8]).buffer;
    const v = val.bytes(ab);
    expect(v.value.case).toBe("bytesValue");
    const bv = ensureCase(v, "bytesValue").value as Uint8Array;
    expect(Array.from(bv)).toEqual([9, 8]);
  });

  test("int64 from number", () => {
    const v = val.int64(42);
    expect(v.value.case).toBe("int64Value");
    expect(v.value.value).toBe("42");
  });

  test("int64 from bigint within range", () => {
    const v = val.int64(123n);
    expect(v.value.case).toBe("int64Value");
    expect(v.value.value).toBe("123");
  });

  test("int64 throws on non-integer number", () => {
    expect(() => val.int64(1.5)).toThrow();
  });

  test("int64 overflow throws (number)", () => {
    // larger than int64 max
    const tooBig = Number(2n ** 63n);
    expect(Number.isFinite(tooBig)).toBe(true);
    expect(() => val.int64(tooBig)).toThrow();
  });

  test("int64 accepts string passthrough", () => {
    const v = val.int64("-42");
    expect(v.value.case).toBe("int64Value");
    expect(v.value.value).toBe("-42");
  });

  test("float64", () => {
    const v = val.float64(3.14);
    expect(v.value.case).toBe("float64Value");
    expect(v.value.value).toBeCloseTo(3.14);
  });

  test("float64 supports NaN and Infinity", () => {
    const n = val.float64(NaN);
    expect(n.value.case).toBe("float64Value");
    expect(Number.isNaN(n.value.value)).toBe(true);
    const inf = val.float64(Infinity);
    expect(inf.value.case).toBe("float64Value");
    expect(inf.value.value).toBe(Infinity);
  });

  test("bigint encodes sign and abs bytes", () => {
    const big = -123456789012345678901234567890n;
    const v = val.bigint(big);
    expect(v.value.case).toBe("bigintValue");
    const pb = ensureCase(v, "bigintValue").value as {
      sign: string;
      absVal: Uint8Array;
    };
    expect(pb.sign).toBe("-1");
    const abs = bytesToBigIntBE(pb.absVal);
    expect(abs).toBe(-big);
  });

  test("bigint uses int64 when safe", () => {
    const v = val.from(99n);
    expect(v.value.case).toBe("int64Value");
    expect(v.value.value).toBe("99");
  });

  test("from(number) outside int64 becomes float64", () => {
    // 2^63 is outside int64 max
    const n = 2 ** 63;
    const v = val.from(n);
    expect(v.value.case).toBe("float64Value");
    expect(v.value.value).toBe(n);
  });

  test("time from Date", () => {
    const d = new Date(1700000123456);
    const v = val.time(d);
    expect(v.value.case).toBe("timeValue");
    const ts = ensureCase(v, "timeValue").value as {
      seconds: string;
      nanos: number;
    };
    expect(ts.seconds).toBe(String(Math.floor(d.getTime() / 1000)));
    expect(ts.nanos).toBe((d.getTime() % 1000) * 1_000_000);
  });

  test("list from raw items and prebuilt values", () => {
    const v1 = val.string("x");
    const v = val.list([1, v1, true]);
    expect(v.value.case).toBe("listValue");
    const items = ensureCase(v, "listValue").value.fields as Value[];
    expect(items[0].value.case).toBe("int64Value");
    expect(items[1].value.case).toBe("stringValue");
    expect(items[2].value.case).toBe("boolValue");
  });

  test("list empty", () => {
    const v = val.list([]);
    expect(v.value.case).toBe("listValue");
    expect((ensureCase(v, "listValue").value.fields as Value[]).length).toBe(0);
  });

  test("map from raw values and prebuilt values", () => {
    const v1 = val.float64(1.25);
    const v = val.mapValue({ a: 1, b: v1, s: "ok" });
    expect(v.value.case).toBe("mapValue");
    const m = ensureCase(v, "mapValue").value.fields as Record<string, Value>;
    expect(m.a.value.case).toBe("int64Value");
    expect(m.b.value.case).toBe("float64Value");
    expect(m.s.value.case).toBe("stringValue");
  });

  test("map empty", () => {
    const v = val.mapValue({});
    expect(v.value.case).toBe("mapValue");
    expect(
      Object.keys(
        ensureCase(v, "mapValue").value.fields as Record<string, Value>
      )
    ).toHaveLength(0);
  });

  test("from object and array", () => {
    const vObj = val.from({ k: [1, "a", false] });
    expect(vObj.value.case).toBe("mapValue");
    const mv = ensureCase(vObj, "mapValue");
    const innerList = mv.value.fields.k as Value;
    const list = ensureCase(innerList, "listValue").value.fields as Value[];
    expect(list[0].value.case).toBe("int64Value");
    expect(list[1].value.case).toBe("stringValue");
    expect(list[2].value.case).toBe("boolValue");
  });

  test("from unsupported object instances throw (Set, Map, Int8Array)", () => {
    expect(() => val.from(new Set([1, 2]))).toThrow();
    expect(() => val.from(new Map([["a", 1]]))).toThrow();
    expect(() => val.from(new Int8Array([1, 2]))).toThrow();
  });

  test("decimal normalization and structure", () => {
    const v = val.decimal("15.2300");
    expect(v.value.case).toBe("decimalValue");
    const d = ensureCase(v, "decimalValue").value as {
      exponent: number;
      coefficient?: { sign: string; absVal: Uint8Array };
    };
    expect(d.exponent).toBe(-2);
    // coefficient should be 1523 (sign + digits)
    const coeffAbs = bytesToBigIntBE(d.coefficient!.absVal);
    expect(d.coefficient!.sign).toBe("1");
    expect(coeffAbs).toBe(1523n);
  });

  test("decimal negative and integer only", () => {
    const v = val.decimal("-123.4500");
    const d = ensureCase(v, "decimalValue").value as {
      exponent: number;
      coefficient?: { sign: string; absVal: Uint8Array };
    };
    expect(d.exponent).toBe(-2);
    expect(d.coefficient!.sign).toBe("-1");
    const coeffAbs = bytesToBigIntBE(d.coefficient!.absVal);
    expect(coeffAbs).toBe(12345n);

    const i = val.decimal("42");
    const id = ensureCase(i, "decimalValue").value as {
      exponent: number;
      coefficient?: { sign: string; absVal: Uint8Array };
    };
    expect(id.exponent).toBe(0);
    expect(bytesToBigIntBE(id.coefficient!.absVal)).toBe(42n);
  });

  test("decimal invalid strings throw", () => {
    expect(() => val.decimal("abc")).toThrow();
    expect(() => val.decimal("1.")).toThrow();
    expect(() => val.decimal(".5")).toThrow();
  });

  test("from throws on null/undefined", () => {
    expect(() => val.from(null as unknown as string)).toThrow();
    expect(() => val.from(undefined as unknown as string)).toThrow();
  });

  test("vJson.get for direct value cases", () => {
    const i = val.int64(7);
    const ij = toJson(ValueSchema, i);
    expect(vJson.get(ij, "int64Value")).toBe("7");
    expect(vJson.get(ij, "stringValue")).toBeUndefined();

    const s = val.string("ok");
    const sj = toJson(ValueSchema, s);
    expect(vJson.get(sj, "stringValue")).toBe("ok");
    expect(vJson.get(sj, "int64Value")).toBeUndefined();
  });

  test("vJson.getMap / getMapField / getFromMap", () => {
    const m = val.mapValue({
      a: val.int64(5),
      b: val.string("x"),
      c: val.bool(true),
    });
    const mj = toJson(ValueSchema, m);

    const map = vJson.getMap(mj);
    expect(map.a?.int64Value).toBe("5");
    expect(map.b?.stringValue).toBe("x");
    expect(map.c?.boolValue).toBe(true);

    const aField = vJson.getMapField(mj, "a");
    expect(aField?.int64Value).toBe("5");

    expect(vJson.getFromMap(mj, "a", "int64Value")).toBe("5");
    expect(vJson.getFromMap(mj, "a", "stringValue")).toBeUndefined();
    expect(vJson.getFromMap(mj, "zzz", "int64Value")).toBeUndefined();
  });
});
