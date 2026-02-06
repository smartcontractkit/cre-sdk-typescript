# SDK Generator: `fromJson` to `create` Migration

## Summary

Changed the SDK code generator to use `create()` instead of `fromJson()` from `@bufbuild/protobuf` when converting plain object inputs to protobuf messages. This eliminates the need for users to manually handle protobuf encoding (e.g., base64 for bytes fields) when calling SDK capability methods.

## Problem

The generated SDK methods accept both protobuf `Message` objects and plain JSON objects for input. Previously, the plain object path used `fromJson()` which expects **JSON wire format** — meaning bytes fields must be **base64-encoded strings**, not `Uint8Array`:

```typescript
// BEFORE: Users had to either use base64 strings...
httpClient.sendRequest(nodeRuntime, {
  url: 'https://api.example.com',
  method: 'POST',
  body: btoa(JSON.stringify({ key: 'value' })), // base64 string — confusing!
})

// ...or escape to protobuf internals
import { create } from '@bufbuild/protobuf'
import { HTTP_CLIENT_PB } from '@chainlink/cre-sdk/pb'

httpClient.sendRequest(
  nodeRuntime,
  create(HTTP_CLIENT_PB.RequestSchema, {
    url: 'https://api.example.com',
    method: 'POST',
    body: new TextEncoder().encode(JSON.stringify({ key: 'value' })),
  }),
)
```

This leaked protobuf serialization details into user-facing APIs.

## Solution

Changed the generator's non-wrapped input path from `fromJson()` to `create()`, and updated the accepted type from `*Json` (JSON wire format) to `MessageInitShape<typeof *Schema>` (native TypeScript types):

```typescript
// AFTER: Plain objects with native types just work
httpClient.sendRequest(nodeRuntime, {
  url: 'https://api.example.com',
  method: 'POST',
  body: new TextEncoder().encode(JSON.stringify({ key: 'value' })), // Uint8Array — natural!
})
```

### Key Type Change

| Field Type | Before (`*Json`) | After (`MessageInitShape`) |
|---|---|---|
| `bytes` | `string` (base64) | `Uint8Array` |
| `int64`/`uint64` | `string` | `bigint` |
| `Duration` | `string` (e.g. `"3.5s"`) | `MessageInit<Duration>` |
| Nested messages | `*Json` (wire format) | `MessageInit<*>` (native) |
| Scalar fields | Same | Same |

## Files Changed

### Generator (source of truth)

| File | Change |
|---|---|
| `src/generator/generate-action.ts` | Non-wrapped path: `fromJson(*Schema, input as *Json)` → `create(*Schema, input as MessageInitShape<typeof *Schema>)` |
| `src/generator/generate-sugar.ts` | Sugar class input type: `*Json` → `MessageInitShape<typeof *Schema>` |
| `src/generator/generate-sdk.ts` | Always import `create`, `fromJson`, `type MessageInitShape` from `@bufbuild/protobuf` |

### Generated SDK (auto-regenerated)

All 10 generated SDK files in `src/generated-sdk/` were regenerated. The non-wrapped action methods now accept `MessageInitShape` instead of `*Json`.

### Hand-written SDK code

| File | Change |
|---|---|
| `src/sdk/runtime.ts` | `Runtime.report()` signature: `ReportRequestJson` → `MessageInitShape<typeof ReportRequestSchema>` |
| `src/sdk/impl/runtime-impl.ts` | `report()` implementation updated to match |
| `src/sdk/utils/capabilities/http/http-helpers.ts` | `sendReport()` callback return type: `RequestJson` → `MessageInitShape<typeof RequestSchema>` |
| `src/sdk/utils/capabilities/blockchain/blockchain-helpers.ts` | Helper functions updated to return native types |

### Blockchain helper changes

| Helper | Before | After |
|---|---|---|
| `bigintToProtoBigInt()` | Returns `BigIntJson` (base64 `absVal`) | Returns `MessageInitShape<typeof BigIntSchema>` (`Uint8Array` `absVal`) |
| `encodeCallMsg()` | Returns `CallMsgJson` (base64 addresses) | Returns `MessageInitShape<typeof CallMsgSchema>` (`Uint8Array` addresses) |
| `LAST_FINALIZED_BLOCK_NUMBER` | `{ absVal: "Aw==", sign: "-1" }` | `{ absVal: new Uint8Array([3]), sign: -1n }` |
| `LATEST_BLOCK_NUMBER` | `{ absVal: "Ag==", sign: "-1" }` | `{ absVal: new Uint8Array([2]), sign: -1n }` |
| `prepareReportRequest()` | Returns `ReportRequestJson` (base64 payload) | Returns `MessageInitShape<typeof ReportRequestSchema>` (`Uint8Array` payload) |

### Tests updated

- `src/sdk/utils/capabilities/http/http-helpers.test.ts`
- `src/sdk/utils/capabilities/blockchain/blockchain-helpers.test.ts`
- `src/sdk/impl/runtime-impl.test.ts`

## What's NOT affected

- **Wrapped types** (e.g., EVM `WriteCreReportRequest`) — these have their own custom conversion logic via `create*()` functions and are unaffected
- **Trigger constructors** — these still use `fromJson()` for config objects (trigger configs typically don't have bytes fields)
- **Protobuf Message inputs** — passing a proper protobuf Message (with `$typeName`) still works via the existing fast path

## How it works

The generated code detects input type at runtime:

```typescript
if ((input as unknown as { $typeName?: string }).$typeName) {
  // Fast path: it's already a protobuf Message, use directly
  payload = input as Request
} else {
  // Plain object path: convert using create() with native types
  payload = create(RequestSchema, input as MessageInitShape<typeof RequestSchema>)
}
```

`create()` from `@bufbuild/protobuf` accepts an initializer with native TypeScript types (e.g., `Uint8Array` for bytes, `bigint` for int64), unlike `fromJson()` which expects JSON wire format (base64 strings, string numbers).

## Breaking Changes

This is a **breaking change** for any code that:

1. Passes `*Json` typed objects (with base64-encoded bytes fields) to SDK capability methods
2. Uses the return values of `encodeCallMsg()`, `bigintToProtoBigInt()`, `LAST_FINALIZED_BLOCK_NUMBER`, `LATEST_BLOCK_NUMBER`, or `prepareReportRequest()` and expects JSON wire format

**Migration**: Replace base64 strings with `Uint8Array` and string numbers with `bigint` in capability method inputs. Use `hexToBytes()` instead of `hexToBase64()` for bytes fields.
