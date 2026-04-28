# Vault Error Handling — Design

**Date:** 2026-04-28
**Author:** ernest.nowacki@smartcontract.com
**Status:** Approved (awaiting plan)
**Scope:** Option B (per brainstorm) — Rust forwarding fix + dedup `SecretsError`. No proto changes. No system-vs-user categorization (B1).

## Background

A user reported the error message `Error converting from 'Error' into js 'await_secrets failed'`. This is a generic transport-layer message produced by the Rust Javy plugin; it carries no information about which secret failed or why. Investigation showed:

- The Rust plugin discards the host's error buffer when the host returns a negative status, throwing a constant string instead.
- The Go SDK reads the buffer and surfaces the host error verbatim, so Go users see actionable messages like `error getting secret <id>: <host detail>`.
- The TypeScript SDK has a rich `SecretsError` class that includes `secretRequest` context and a hint about secret configuration, but it only fires on protocol-typed errors. Transport failures bypass it entirely.
- Two `SecretsError` classes exist. The minimal one (`packages/cre-sdk/src/sdk/utils/secrets-error.ts`) has zero importers and is dead code.

## Goal

Make every secret retrieval failure surface to user code as a `SecretsError` carrying the original host message and the failing `SecretRequest`. Eliminate the duplicate class.

## Non-Goals

- Distinguishing system errors from user errors. The current single message template (which suggests verifying the secret name) will be used for all failures, including system faults. Accepted trade-off; revisit if user feedback indicates the suffix misleads operators.
- Adding a typed error enum to the protobuf definition.
- Changing host-side error semantics or wire format.

## Changes

### 1. Rust — forward host error buffer

**File:** `packages/cre-sdk-javy-plugin/src/javy_chainlink_sdk/src/lib.rs`

Two functions need the same fix:

- `getSecrets` (current lines 172-174)
- `awaitSecrets` (current lines 205-207)

Today both throw a constant string when `n < 0`:

```rust
if n < 0 {
    return Err(Error::new_into_js("Error", "await_secrets failed"));
}
```

Replace with: read `&buf[..(-n) as usize]` as UTF-8, throw a JS `Error` carrying that string. If the buffer slice is empty or fails UTF-8 decode, fall back to the existing constant message (`"get_secrets failed"` / `"await_secrets failed"`) so callers always get *some* message.

This mirrors the Go SDK at `cre-sdk-go/cre/wasm/runtime.go:80` and `:105`:

```go
if bytes < 0 {
    return nil, errors.New(string(response[:-bytes]))
}
```

The host-side wire contract — "on failure, write the error string to the response buffer; return the negated length" — is the contract the Go SDK already relies on. We adopt the same contract on the TS side.

### 2. TypeScript — wrap host calls in `SecretsError`

**File:** `packages/cre-sdk/src/sdk/impl/runtime-impl.ts`

Today `awaitAndUnwrapSecret` (lines 392-415) catches every protocol-level failure path with a `SecretsError`, but `helpers.awaitSecrets()` (line 394) is uncaught. After the Rust fix it will throw a real host message — that throw must be wrapped so the caller sees a `SecretsError`, not a raw `Error`.

Wrap the call:

```ts
let awaitResponse: AwaitSecretsResponse
try {
  awaitResponse = this.helpers.awaitSecrets(awaitRequest, this.maxResponseSize)
} catch (err) {
  throw new SecretsError(secretRequest, err instanceof Error ? err.message : String(err))
}
```

Apply the same wrap to the `getSecrets` setup call at `runtime-impl.ts:378`. The current `if (!this.helpers.getSecrets(...))` boolean check is dead — Rust throws on failure rather than returning a negative number through to TS. Replace with a try/catch that throws `SecretsError`.

**File:** `packages/cre-sdk/src/sdk/wasm/runtime.ts`

`getSecrets` at lines 72-75 returns `boolean` based on a `>= 0` comparison that can never fail (Rust throws first). Either:

- Keep the `boolean` return for backward compatibility but always return `true` (the throw is the only failure signal), or
- Change the return type to `void` and update callers.

Pick `void` — the boolean is misleading. Update the helpers interface (`runtime-impl.ts:441`) and `wasm/runtime.ts` together.

### 3. Delete dead file

**File:** `packages/cre-sdk/src/sdk/utils/secrets-error.ts`

Has zero importers (verified via repo-wide grep). Delete the file. The canonical `SecretsError` lives in `packages/cre-sdk/src/sdk/errors.ts:17`.

## Resulting User-Facing Behavior

After the fix, all secret failures produce:

```
SecretsError: secret retrieval failed for <id> (namespace: <ns>): <host message>. Verify the secret name is correct and that the secret has been configured for this workflow
```

Where `<host message>` is whatever the host wrote into the response buffer — the same text Go users already see.

## Tests

**Unit tests** in `packages/cre-sdk/src/sdk/impl/runtime-impl.test.ts`:

- New case: `helpers.awaitSecrets` mock throws `new Error('vault: signer unreachable')`. Assert the caller receives `SecretsError` with `error: 'vault: signer unreachable'` and the original `secretRequest`.
- New case: `helpers.getSecrets` mock throws. Assert `SecretsError` is thrown carrying the thrown message, with the original `secretRequest`.
- Existing case at line 458 (`'host is not making the secrets request'`) is removed: that branch only existed because the helper returned `boolean`. After the change, `getSecrets` either returns or throws, and the throw path is covered by the new case above. Other existing cases (458-601 range) covering `'no response'`, `'invalid value returned from host'`, the typed `response.value.error` path, and the `'cannot unmarshal returned value from host'` default keep passing unchanged.

**Rust tests** in the Javy plugin:

- If the plugin has a unit-test harness, add a test that simulates `n < 0` with a known buffer and asserts the thrown JS error message matches the buffer contents.
- If not, the integration test path (TS test calling through to a mocked host) covers it.

## Risks and Open Questions

- **Host wire contract assumption.** We assume the host writes the error string into the response buffer with length `-n` on failure, as Go relies on. Before merging, verify with the host implementation that this is intentional and documented (not just an artifact Go happens to depend on). If the host does not always write a string, the UTF-8 fallback ensures we degrade gracefully to the old constant message.
- **B1 trade-off accepted.** The hint "Verify the secret name is correct and that the secret has been configured for this workflow" will appear on system errors where it is misleading. Revisit if user feedback indicates this is a frequent source of confusion; that revisit would be a separate spec (Option C — categorization, possibly with a proto enum).
- **Boolean return change.** Switching `getSecrets` from `boolean` to `void` is a small interface change. Internal-only — no public API affected.

## Out of Scope (Future Work)

- Proto-level error enum (`SecretErrorKind: NotFound | Unauthorized | Network | System | ...`). Would require host-side coordination and is the right path if categorization becomes valuable.
- Applying the same forwarding fix to other host functions in `lib.rs` (e.g. `callCapability`, `awaitCapabilities`). The same generic-message problem likely exists there. Tracked as a follow-up; this spec stays focused on the secrets path that triggered the report.
