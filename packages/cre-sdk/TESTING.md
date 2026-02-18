# Testing CRE Workflows

The CRE SDK includes a built-in test framework that lets you unit test your TypeScript workflows without compiling to WASM or running on a DON. You can mock capabilities (HTTP, EVM, etc.), control secrets and time, capture logs, and assert on results — all with full type safety.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
  - [The test() Function](#the-test-function)
  - [Creating a Test Runtime](#creating-a-test-runtime)
- [Mocking Capabilities](#mocking-capabilities)
  - [Setting Up Mocks](#setting-up-mocks)
  - [Available Mocks](#available-mocks)
  - [EVM Mocks with Chain Selectors](#evm-mocks-with-chain-selectors)
  - [HTTP Mocks](#http-mocks)
  - [Flexible Return Types](#flexible-return-types)
- [Testing Secrets](#testing-secrets)
- [Testing Consensus & Node Mode](#testing-consensus--node-mode)
- [Testing Reports](#testing-reports)
- [Controlling Time](#controlling-time)
- [Capturing Logs](#capturing-logs)
- [Response Size Validation](#response-size-validation)
- [API Reference](#api-reference)
  - [Test Functions](#test-functions)
  - [TestRuntime](#testruntime)
  - [Capability Mocks](#capability-mocks)
  - [Constants](#constants)

## Prerequisites

1. The [bun runtime](https://bun.com/) (>= 1.2.21)
2. A CRE workflow project set up with `@chainlink/cre-sdk`

## Quick Start

Tests use the `test` function and `newTestRuntime` from `@chainlink/cre-sdk/test`:

```typescript
import { describe, expect } from "bun:test";
import { test, newTestRuntime } from "@chainlink/cre-sdk/test";

describe("my workflow", () => {
  test("returns the expected value", () => {
    const runtime = newTestRuntime();

    runtime.log("hello from test");
    expect(runtime.getLogs()).toContain("hello from test");
  });
});
```

Run tests with:

```bash
bun test
```

**Important**: You must use `test` from `@chainlink/cre-sdk/test`, **not** from `bun:test`. The CRE `test` function sets up an isolated capability registry for each test. Using the standard `bun:test` `test` directly will cause mocks to fail at runtime. `describe` and `expect` should still be imported from `bun:test`.

## Core Concepts

### The test() Function

The CRE `test()` function wraps Bun's test runner with per-test isolation. Each test gets its own capability registry, so mocks registered in one test are invisible to other tests:

```typescript
import { test, newTestRuntime, BasicTestActionMock } from "@chainlink/cre-sdk/test";

test("test A registers a mock", () => {
  BasicTestActionMock.testInstance(); // only visible in this test
  const runtime = newTestRuntime();
  // ...
});

test("test B has a clean slate", () => {
  // BasicTestActionMock is NOT registered here
  const runtime = newTestRuntime();
  // ...
});
```

### Creating a Test Runtime

`newTestRuntime()` creates a `TestRuntime` instance that behaves like the real CRE runtime but executes capability calls synchronously against your mocks:

```typescript
import { test, newTestRuntime } from "@chainlink/cre-sdk/test";

test("basic runtime", () => {
  // No secrets, default options
  const runtime = newTestRuntime();

  // With secrets
  const secrets = new Map([["myNamespace", new Map([["apiKey", "test-key-123"]])]]);
  const runtimeWithSecrets = newTestRuntime(secrets);

  // With options
  const runtimeWithOptions = newTestRuntime(null, {
    timeProvider: () => 1700000000000,
    maxResponseSize: 1024,
  });
});
```

## Mocking Capabilities

### Setting Up Mocks

Each capability has a corresponding mock class with a `testInstance()` factory. Register the mock, set method handlers, then use the real capability class as normal:

```typescript
import { describe, expect } from "bun:test";
import { test, newTestRuntime, BasicTestActionMock } from "@chainlink/cre-sdk/test";
import { BasicActionCapability } from "@cre/generated-sdk/capabilities/internal/basicaction/v1/basicaction_sdk_gen";

describe("capability mocking", () => {
  test("mock returns the value you define", () => {
    // 1. Get the mock instance and set handlers
    const mock = BasicTestActionMock.testInstance();
    mock.performAction = (input) => {
      return { adaptedThing: "mocked-result" };
    };

    // 2. Create the runtime
    const runtime = newTestRuntime();

    // 3. Use the real capability — it routes through the mock
    const capability = new BasicActionCapability();
    const result = capability.performAction(runtime, { inputThing: true }).result();

    // 4. Assert
    expect(result.adaptedThing).toBe("mocked-result");
  });
});
```

The pattern is always:

1. Call `MockClass.testInstance()` to register the mock
2. Assign handler functions to the mock's method properties
3. Create the runtime with `newTestRuntime()`
4. Use the real capability classes — calls are intercepted by the mock
5. Call `.result()` to get the response and assert on it

If you invoke a capability method without setting a handler, the framework throws a clear error:

```
PerformAction: no implementation provided; set the mock's performAction property to define the return value.
```

### Available Mocks

Generated mocks are available for all capabilities. Import them from `@chainlink/cre-sdk/test`:

| Mock Class | Capability | Methods |
|---|---|---|
| `EvmMock` | EVM blockchain client | `callContract`, `filterLogs`, `balanceAt`, `estimateGas`, `getTransactionByHash`, `getTransactionReceipt`, `headerByNumber`, `writeReport` |
| `HttpActionsMock` | HTTP client | `sendRequest` |
| `ConfidentialHttpMock` | Confidential HTTP client | `sendRequest` |
| `ConsensusMock` | Consensus (auto-registered) | `simple`, `report` |
| `BasicTestActionMock` | Basic action (internal) | `performAction` |
| `BasicTestActionTriggerMock` | Action and trigger (internal) | `performAction` |

### EVM Mocks with Chain Selectors

EVM mocks are tag-aware — different chain selectors produce different, independent mock instances:

```typescript
import { describe, expect } from "bun:test";
import { test, newTestRuntime, EvmMock } from "@chainlink/cre-sdk/test";
import { ClientCapability as EvmClient } from "@cre/generated-sdk/capabilities/blockchain/evm/v1alpha/client_sdk_gen";

describe("multi-chain EVM mocks", () => {
  test("different chains have independent mocks", () => {
    const sepoliaSelector = 11155111n;
    const mumbaiSelector = 80001n;

    // Each chain gets its own mock instance
    const sepoliaMock = EvmMock.testInstance(sepoliaSelector);
    const mumbaiMock = EvmMock.testInstance(mumbaiSelector);

    sepoliaMock.callContract = () => ({ data: "AQID" }); // base64 for [1, 2, 3]
    mumbaiMock.callContract = () => ({ data: "BAUG" }); // base64 for [4, 5, 6]

    const runtime = newTestRuntime();

    const sepoliaResult = new EvmClient(sepoliaSelector)
      .callContract(runtime, { call: { to: "", data: "" } })
      .result();
    const mumbaiResult = new EvmClient(mumbaiSelector)
      .callContract(runtime, { call: { to: "", data: "" } })
      .result();

    expect(sepoliaResult.data).toEqual(new Uint8Array([1, 2, 3]));
    expect(mumbaiResult.data).toEqual(new Uint8Array([4, 5, 6]));
  });
});
```

Calling `testInstance()` with the same chain selector always returns the same instance:

```typescript
const instance1 = EvmMock.testInstance(11155111n);
const instance2 = EvmMock.testInstance(11155111n);
// instance1 === instance2
```

### HTTP Mocks

Mock HTTP responses to test workflows that call external APIs:

```typescript
import { describe, expect } from "bun:test";
import {
  test,
  newTestRuntime,
  HttpActionsMock,
} from "@chainlink/cre-sdk/test";
import { ClientCapability as HTTPClient } from "@cre/generated-sdk/capabilities/networking/http/v1alpha/client_sdk_gen";

describe("HTTP mocking", () => {
  test("mock an API response", () => {
    const mock = HttpActionsMock.testInstance();
    mock.sendRequest = (input) => {
      return {
        statusCode: 200,
        headers: {},
        body: new TextEncoder().encode(JSON.stringify({ price: 42000 })),
      };
    };

    const runtime = newTestRuntime();
    const http = new HTTPClient();
    const response = http
      .sendRequest(runtime, { url: "https://api.example.com/price", method: "GET" })
      .result();

    expect(response.statusCode).toBe(200);
  });
});
```

### Flexible Return Types

Mock handlers accept either protobuf message types or plain JSON objects. The framework handles conversion automatically:

```typescript
// Plain JSON — simpler, recommended for most tests
mock.performAction = (input) => {
  return { adaptedThing: "result" };
};

// Protobuf message type — use when you need precise control
import { create } from "@bufbuild/protobuf";
import { OutputsSchema } from "@cre/generated/capabilities/internal/basicaction/v1/basic_action_pb";

mock.performAction = (input) => {
  return create(OutputsSchema, { adaptedThing: "result" });
};
```

## Testing Secrets

Pass a `Map<namespace, Map<id, value>>` to `newTestRuntime()` to provide test secrets:

```typescript
import { describe, expect } from "bun:test";
import { test, newTestRuntime } from "@chainlink/cre-sdk/test";

describe("secrets", () => {
  test("secret is accessible by namespace and id", () => {
    const secrets = new Map([
      ["myNamespace", new Map([["apiKey", "test-key-123"]])],
    ]);
    const runtime = newTestRuntime(secrets);

    const secret = runtime.getSecret({ id: "apiKey", namespace: "myNamespace" }).result();
    expect(secret.value).toBe("test-key-123");
  });

  test("missing secret throws SecretsError", () => {
    const runtime = newTestRuntime();
    expect(() =>
      runtime.getSecret({ id: "missing", namespace: "ns" }).result()
    ).toThrow();
  });
});
```

## Testing Consensus & Node Mode

The test framework includes a default consensus handler that supports both `Simple` (median aggregation) and `Report` methods. You do not need to mock consensus manually — `runInNodeMode` and `report()` work out of the box:

```typescript
import { describe, expect } from "bun:test";
import { consensusMedianAggregation } from "@chainlink/cre-sdk";
import { test, newTestRuntime } from "@chainlink/cre-sdk/test";

describe("consensus", () => {
  test("runInNodeMode returns the observed value", () => {
    const runtime = newTestRuntime();
    const result = runtime.runInNodeMode(() => 42, consensusMedianAggregation())();
    expect(result.result()).toBe(42);
  });

  test("error with default falls back to default value", () => {
    const runtime = newTestRuntime();
    const result = runtime.runInNodeMode(
      () => { throw new Error("fail"); },
      consensusMedianAggregation<number>().withDefault(100),
    )();
    expect(result.result()).toBe(100);
  });

  test("error without default propagates", () => {
    const runtime = newTestRuntime();
    const result = runtime.runInNodeMode(
      () => { throw new Error("no default"); },
      consensusMedianAggregation(),
    )();
    expect(() => result.result()).toThrow("no default");
  });
});
```

## Testing Reports

The default `Report` consensus handler generates test metadata and signatures automatically:

```typescript
import { describe, expect } from "bun:test";
import { test, newTestRuntime, REPORT_METADATA_HEADER_LENGTH } from "@chainlink/cre-sdk/test";

describe("reports", () => {
  test("report generates metadata and signatures", () => {
    const runtime = newTestRuntime();
    const payload = Buffer.from(new Uint8Array([1, 2, 3])).toString("base64");
    const result = runtime.report({ encodedPayload: payload }).result();

    const unwrapped = result.x_generatedCodeOnly_unwrap();
    expect(unwrapped.rawReport.length).toBe(REPORT_METADATA_HEADER_LENGTH + 3);
    expect(unwrapped.sigs).toHaveLength(2);
  });
});
```

## Controlling Time

Override `Date.now()` for deterministic time-dependent tests:

```typescript
import { describe, expect } from "bun:test";
import { test, newTestRuntime } from "@chainlink/cre-sdk/test";

describe("time control", () => {
  test("via constructor option", () => {
    const fixedTime = 1700000000000;
    const runtime = newTestRuntime(null, {
      timeProvider: () => fixedTime,
    });
    expect(runtime.now().getTime()).toBe(fixedTime);
  });

  test("via setTimeProvider after creation", () => {
    const runtime = newTestRuntime();
    runtime.setTimeProvider(() => 999888777666);
    expect(runtime.now().getTime()).toBe(999888777666);
  });
});
```

## Capturing Logs

`TestRuntime.getLogs()` returns all messages written via `runtime.log()`:

```typescript
import { describe, expect } from "bun:test";
import { test, newTestRuntime } from "@chainlink/cre-sdk/test";

describe("log capture", () => {
  test("captures log messages in order", () => {
    const runtime = newTestRuntime();
    runtime.log("step 1 complete");
    runtime.log("step 2 complete");

    expect(runtime.getLogs()).toEqual(["step 1 complete", "step 2 complete"]);
  });
});
```

## Response Size Validation

Test that your workflow handles response size limits correctly by setting `maxResponseSize`:

```typescript
import { describe, expect } from "bun:test";
import { test, newTestRuntime, RESPONSE_BUFFER_TOO_SMALL } from "@chainlink/cre-sdk/test";

describe("response size", () => {
  test("oversized response throws", () => {
    const runtime = newTestRuntime(null, { maxResponseSize: 1 });
    const payload = Buffer.from(new Uint8Array([1, 2, 3])).toString("base64");

    expect(() =>
      runtime.report({ encodedPayload: payload }).result()
    ).toThrow(RESPONSE_BUFFER_TOO_SMALL);
  });
});
```

The default maximum response size is 5 MB.

## API Reference

### Test Functions

- `test(title, fn)`: Run a test with an isolated capability registry. Use this instead of `bun:test`'s `test`.
- `newTestRuntime(secrets?, options?)`: Create a `TestRuntime` instance for use in tests.

**`newTestRuntime` parameters:**

| Parameter | Type | Description |
|---|---|---|
| `secrets` | `Map<string, Map<string, string>>` \| `null` | Map of `namespace` -> `id` -> `value` for secret simulation |
| `options.timeProvider` | `() => number` | Override `Date.now()` for deterministic time |
| `options.maxResponseSize` | `number` | Maximum response size in bytes (default: 5 MB) |

### TestRuntime

`TestRuntime` extends the real runtime with test-specific methods:

- `getLogs(): string[]` — Returns all captured log messages
- `setTimeProvider(fn: () => number): void` — Override the time provider after creation

All standard runtime methods work as expected: `log()`, `now()`, `getSecret()`, `runInNodeMode()`, `report()`, and capability calls.

### Capability Mocks

Every generated capability mock follows the same pattern:

```typescript
class XMock {
  static readonly CAPABILITY_ID: string;

  // One property per capability method
  methodName?: (input: InputType) => OutputType | OutputTypeJson;

  // Singleton factory — must be called inside test()
  static testInstance(...tags): XMock;
}
```

**Key behaviors:**

- `testInstance()` returns the same instance when called with identical arguments within a single test
- Mocks self-register with the test runtime's capability registry on construction
- Handlers receive decoded protobuf inputs and may return either typed messages or plain JSON
- Invoking a capability method without a handler set throws a descriptive error
- Calling `testInstance()` outside of a CRE `test()` block throws an error

### Constants

- `RESPONSE_BUFFER_TOO_SMALL` — Error message thrown when response exceeds `maxResponseSize`
- `DEFAULT_MAX_RESPONSE_SIZE_BYTES` — Default max response size (5 MB)
- `REPORT_METADATA_HEADER_LENGTH` — Length of test report metadata header (109 bytes)
