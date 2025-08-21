import { create } from "@bufbuild/protobuf";
import type { Timestamp } from "@bufbuild/protobuf/wkt";
import type {
  Value,
  BigInt as ProtoBigInt,
  Map as ProtoMap,
  List as ProtoList,
  Decimal as ProtoDecimal,
} from "@cre/generated/values/v1/values_pb";
import type { ValueJson } from "@cre/generated/values/v1/values_pb";
import {
  ValueSchema,
  BigIntSchema,
  MapSchema,
  ListSchema,
  DecimalSchema,
} from "@cre/generated/values/v1/values_pb";

// int64 bounds
const INT64_MIN = -(2n ** 63n); // -9,223,372,036,854,775,808
const INT64_MAX = 2n ** 63n - 1n; // 9,223,372,036,854,775,807

const toUint8Array = (input: Uint8Array | ArrayBuffer): Uint8Array =>
  input instanceof Uint8Array ? input : new Uint8Array(input);

/**
 * Converts a bigint to a byte array using big-endian byte order.
 * Big-endian means the most significant byte comes first in the array.
 *
 * @param abs - The absolute value of the bigint to convert (should be non-negative)
 * @returns A Uint8Array representing the bigint in big-endian byte order
 *
 * @example
 * ```typescript
 * bigintToBytesBE(0n)     // returns new Uint8Array()
 * bigintToBytesBE(255n)   // returns new Uint8Array([0xFF])
 * bigintToBytesBE(0x1234n) // returns new Uint8Array([0x12, 0x34])
 * ```
 */
const bigintToBytesBE = (abs: bigint): Uint8Array => {
  if (abs === 0n) return new Uint8Array();
  let hex = abs.toString(16);
  if (hex.length % 2 === 1) hex = "0" + hex;
  const len = hex.length / 2;
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
};

/**
 * Converts a JavaScript Native bigint to a protobuf BigInt message.
 *
 * @param v - The bigint to convert
 * @returns A protobuf BigInt message
 */
const bigIntToProtoBigInt = (v: bigint): ProtoBigInt => {
  const sign = v === 0n ? 0n : v < 0n ? -1n : 1n;
  const abs = v < 0n ? -v : v;
  return create(BigIntSchema, {
    absVal: bigintToBytesBE(abs),
    sign: sign.toString(),
  });
};

const toInt64String = (v: number | bigint | string): string => {
  if (typeof v === "string") return v; // assume valid int64 string
  if (typeof v === "bigint") {
    if (v < INT64_MIN || v > INT64_MAX) throw new Error("int64 overflow");
    return v.toString();
  }
  if (!Number.isFinite(v) || !Number.isInteger(v))
    throw new Error("int64 requires an integer number");
  const bi = BigInt(v);
  if (bi < INT64_MIN || bi > INT64_MAX) throw new Error("int64 overflow");
  return bi.toString();
};

const toTimestamp = (d: Date | number | string): Timestamp => {
  const date = d instanceof Date ? d : new Date(d);
  const ms = date.getTime();
  const secs = Math.trunc(ms / 1000);
  let msRemainder = ms - secs * 1000;
  if (msRemainder < 0) msRemainder += 1000; // normalize negatives
  const nanos = msRemainder * 1_000_000;
  return { seconds: secs.toString(), nanos } as unknown as Timestamp;
};

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && v.constructor === Object;

const wrapInternal = (v: unknown): Value => {
  // null/undefined not supported by Value oneof
  if (v === null || v === undefined)
    throw new Error("cannot wrap null/undefined into Value");

  // Bytes
  if (v instanceof Uint8Array)
    return create(ValueSchema, { value: { case: "bytesValue", value: v } });
  if (v instanceof ArrayBuffer)
    return create(ValueSchema, {
      value: { case: "bytesValue", value: new Uint8Array(v) },
    });

  // Date / time
  if (v instanceof Date)
    return create(ValueSchema, {
      value: { case: "timeValue", value: toTimestamp(v) },
    });

  // Primitive
  switch (typeof v) {
    case "string":
      return create(ValueSchema, { value: { case: "stringValue", value: v } });
    case "boolean":
      return create(ValueSchema, { value: { case: "boolValue", value: v } });
    case "bigint": {
      // prefer int64 when in range, else BigInt proto
      if (v >= INT64_MIN && v <= INT64_MAX) {
        return create(ValueSchema, {
          value: { case: "int64Value", value: v.toString() },
        });
      }
      return create(ValueSchema, {
        value: { case: "bigintValue", value: bigIntToProtoBigInt(v) },
      });
    }
    case "number": {
      if (Number.isInteger(v)) {
        const bi = BigInt(v);
        if (bi >= INT64_MIN && bi <= INT64_MAX) {
          return create(ValueSchema, {
            value: { case: "int64Value", value: bi.toString() },
          });
        }
      }
      return create(ValueSchema, { value: { case: "float64Value", value: v } });
    }
    case "object":
      break; // handled below
    default:
      throw new Error(`unsupported type: ${typeof v}`);
  }

  // Array
  if (Array.isArray(v)) {
    const fields = v.map(wrapInternal);
    const list: ProtoList = create(ListSchema, { fields });
    return create(ValueSchema, { value: { case: "listValue", value: list } });
  }

  // Plain object -> Map
  if (isPlainObject(v)) {
    const fields: Record<string, Value> = {};
    for (const [k, vv] of Object.entries(v)) {
      fields[k] = wrapInternal(vv);
    }
    const map: ProtoMap = create(MapSchema, { fields });
    return create(ValueSchema, { value: { case: "mapValue", value: map } });
  }

  // Fallback
  throw new Error("unsupported object instance");
};

export type SupportedValueTypes =
  | "string"
  | "bool"
  | "bytes"
  | "int64"
  | "float64"
  | "bigint"
  | "time"
  | "list"
  | "map"
  | "decimal";

export const val = {
  string: (s: string): Value =>
    create(ValueSchema, { value: { case: "stringValue", value: s } }),
  bool: (b: boolean): Value =>
    create(ValueSchema, { value: { case: "boolValue", value: b } }),
  bytes: (d: Uint8Array | ArrayBuffer): Value =>
    create(ValueSchema, {
      value: { case: "bytesValue", value: toUint8Array(d) },
    }),
  int64: (n: number | bigint | string): Value =>
    create(ValueSchema, {
      value: { case: "int64Value", value: toInt64String(n) },
    }),
  float64: (n: number): Value =>
    create(ValueSchema, { value: { case: "float64Value", value: n } }),
  bigint: (n: bigint): Value =>
    create(ValueSchema, {
      value: { case: "bigintValue", value: bigIntToProtoBigInt(n) },
    }),
  time: (d: Date | number | string): Value =>
    create(ValueSchema, {
      value: { case: "timeValue", value: toTimestamp(d) },
    }),
  list: (items: Array<unknown | Value>): Value => {
    const fields = items.map((i) =>
      typeof i === "object" && i !== null && (i as Value).value
        ? (i as Value)
        : wrapInternal(i)
    );
    return create(ValueSchema, {
      value: { case: "listValue", value: create(ListSchema, { fields }) },
    });
  },
  mapValue: (obj: Record<string, unknown | Value>): Value => {
    const fields: Record<string, Value> = {};
    for (const [k, v] of Object.entries(obj)) {
      fields[k] =
        typeof v === "object" && v !== null && (v as Value).value
          ? (v as Value)
          : wrapInternal(v);
    }
    return create(ValueSchema, {
      value: { case: "mapValue", value: create(MapSchema, { fields }) },
    });
  },
  decimal: (s: string): Value => {
    // Parse decimal string into coefficient (bigint) and exponent (int32)
    const m = /^([+-])?(\d+)(?:\.(\d+))?$/.exec(s.trim());
    if (!m) throw new Error("invalid decimal string");
    const signStr = m[1] ?? "+";
    let intPart = m[2] ?? "0";
    let fracPart = m[3] ?? "";
    // remove trailing zeros in fractional part to normalize
    fracPart = fracPart.replace(/0+$/g, "");
    const exp = fracPart.length === 0 ? 0 : -fracPart.length;
    const digits = intPart + fracPart || "0";
    const coeff = BigInt((signStr === "-" ? "-" : "") + digits);
    const decimal: ProtoDecimal = create(DecimalSchema, {
      coefficient: bigIntToProtoBigInt(coeff),
      exponent: exp,
    });
    return create(ValueSchema, {
      value: { case: "decimalValue", value: decimal },
    });
  },
  from: (v: unknown): Value => wrapInternal(v),
} as const;

export type { Value };

export type ValueJsonCase = Extract<keyof ValueJson, string>;
export type ValueJsonReturn<T extends ValueJsonCase> = ValueJson[T];

export const vJson = {
  getMap: (v: ValueJson): Record<string, ValueJson> => v.mapValue?.fields ?? {},
  getMapField: (v: ValueJson, key: string): ValueJson | undefined =>
    v.mapValue?.fields?.[key],
  get: <T extends ValueJsonCase>(v: ValueJson, type: T): ValueJsonReturn<T> =>
    v[type] as ValueJsonReturn<T>,
  getFromMap: <T extends ValueJsonCase>(
    v: ValueJson,
    key: string,
    type: T
  ): ValueJsonReturn<T> => {
    const field = v.mapValue?.fields?.[key];
    return field ? (field[type] as ValueJsonReturn<T>) : undefined;
  },
};
