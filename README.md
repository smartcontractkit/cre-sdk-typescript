# Chainlink CRE SDK for TypeScript

Build decentralized workflows that combine off-chain computation with on-chain execution using the Chainlink Runtime Environment (CRE) SDK.

## What is CRE?

The Chainlink Runtime Environment enables developers to create workflows that:

- **Fetch data** from external APIs with built-in consensus
- **Interact with blockchains** across multiple networks
- **Coordinate complex operations** with triggers and scheduling
- **Aggregate results** from multiple data sources reliably

Perfect for building price feeds, automated trading strategies, cross-chain applications, and any workflow requiring reliable off-chain computation with on-chain execution.

## Package Structure

This monorepo contains:

- **[@chainlink/cre-sdk](./packages/cre-sdk)** - Main SDK for building CRE workflows
- **[@chainlink/cre-sdk-examples](./packages/cre-sdk-examples)** - Example workflows and patterns
- **[@chainlink/cre-sdk-javy-plugin](./packages/cre-sdk-javy-plugin)** - WebAssembly compilation tools

## Examples

### 📅 Scheduled Tasks

```typescript
// Execute every 5 minutes
const cron = new cre.capabilities.CronCapability();
cron.trigger({ schedule: "0 */5 * * * *" });
```

### 🌐 API Data Fetching

```typescript
// Fetch with built-in consensus across nodes
const price = await cre.runInNodeMode(
  fetchPriceData,
  consensusMedianAggregation(),
)(config);
```

### ⛓️ Blockchain Integration

```typescript
// Read/write to any EVM chain
const evmClient = new cre.capabilities.EVMClient(
  undefined,
  BigInt("5009297550715157269"), // Ethereum Sepolia
);
```

## Key Features

- **🔄 Multi-Node Consensus** - Aggregate data from multiple sources reliably
- **⚡ Cross-Chain Support** - Work with 200+ blockchain networks
- **📊 Built-in Aggregation** - Median, mean, and custom consensus mechanisms
- **🛡️ Type Safety** - Full TypeScript support with Zod validation
- **🎯 Event-Driven** - Cron triggers, HTTP webhooks, and custom events
- **🔗 Viem Integration** - Native support for Ethereum interactions

## Use Cases

**🏦 DeFi Applications**

- Automated yield farming strategies
- Cross-chain arbitrage bots
- Dynamic rebalancing portfolios
- Liquidation protection systems

**📊 Data Oracles**

- Custom price feeds with multiple sources
- Weather data aggregation
- Sports scores and betting odds
- Real-world asset tokenization data

**🔗 Cross-Chain Operations**

- Bridge monitoring and alerts
- Multi-chain governance voting
- Cross-chain token transfers
- Unified liquidity management

## Workflow Type Safety

CRE workflows compile from TypeScript to WebAssembly and run inside a Javy/QuickJS sandbox — not a full Node.js or browser runtime. The SDK ships a multi-layered type safety system that catches incompatible API usage at every stage: in the IDE, during type checking, and at build time.

### How It Works

The compilation pipeline (`cre-compile`) runs two validation passes before bundling and WASM compilation:

1. **TypeScript type checking** — Runs `tsc` against your workflow using the nearest `tsconfig.json`. Catches all standard TypeScript errors plus SDK-provided type restrictions (see below).

2. **Runtime compatibility validation** — Performs AST-level static analysis to detect imports of restricted Node.js modules and usage of unavailable global APIs. This catches patterns that type-level checks alone can't cover, such as `require()` calls, dynamic `import()`, and usage inside `.js` files.

```
cre-compile workflow.ts output.wasm
         │
         ├─ Step 1: TypeScript type check (uses your tsconfig.json)
         ├─ Step 2: Runtime compatibility validation (always runs)
         ├─ Step 3: Bundle to JS
         └─ Step 4: Compile to WASM
```

### Workflow `tsconfig.json`

Every new workflow project ships with a recommended `tsconfig.json`:

```jsonc
{
  "compilerOptions": {
    "lib": ["ESNext"],
    "target": "ESNext",
    "module": "ESNext",
    "moduleDetection": "force",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "types": [],
    // ...
  },
  "include": ["src/**/*"],
}
```

The critical setting is **`"types": []`**. By default TypeScript auto-includes all `@types/*` packages from `node_modules`, which would expose full Node.js and Bun type definitions. Setting `types` to an empty array prevents this, so only types explicitly provided by `@chainlink/cre-sdk` are available. This means you get type errors the moment you try to use APIs that won't exist at runtime.

### Restricted Node.js Modules

The SDK blocks imports from Node.js built-in modules that cannot run in the WASM sandbox. Both bare specifiers (`crypto`) and `node:`-prefixed forms (`node:crypto`) are covered.

**Blocked modules:** `crypto`, `fs`, `fs/promises`, `net`, `http`, `https`, `child_process`, `os`, `stream`, `worker_threads`, `dns`, `zlib`

All exports from these modules are typed as `never`, so your IDE shows errors immediately:

```typescript
import { createHash } from "node:crypto";
//       ^^^^^^^^^^ Type 'never' is not assignable to ...

// The import itself also triggers a build-time error:
// ❌ 'node:crypto' is not available in CRE workflow runtime.
```

These restrictions are enforced at **two levels**:

- **IDE/type-check time** — `@deprecated` JSDoc annotations produce strikethrough text and warnings. The `never` types cause type errors at every call site.
- **Build time** — The runtime compatibility validator walks the AST of your workflow and all transitively imported local files, catching every import syntax (`import`, `export ... from`, `require()`, `import()`). This check **always runs** — even with `--skip-type-checks`.

### Restricted Global APIs

Some global APIs that exist in browsers or Node.js are not available in the QuickJS runtime. The SDK overrides their type definitions with `never` types and `@deprecated` markers that point you to the correct CRE alternative:

| Restricted API                   | CRE Alternative                        |
| -------------------------------- | -------------------------------------- |
| `fetch()`                        | `cre.capabilities.HTTPClient`          |
| `setTimeout()`                   | `cre.capabilities.CronCapability`      |
| `setInterval()`                  | `cre.capabilities.CronCapability`      |
| `window`, `document`             | Not applicable (no DOM)                |
| `XMLHttpRequest`                 | `cre.capabilities.HTTPClient`          |
| `localStorage`, `sessionStorage` | Not applicable (no persistent storage) |

```typescript
// ❌ IDE shows strikethrough + deprecation warning:
// "@deprecated fetch is not available in CRE WASM workflows.
//  Use cre.capabilities.HTTPClient instead."
const response = await fetch("https://api.example.com");
//                     ~~~~~ Error: Argument of type 'string' is not assignable to parameter of type 'never'

// ✅ Correct approach — use HTTPClient:
import { HTTPClient } from "@chainlink/cre-sdk";

const client = new HTTPClient();
const response = client.sendRequest({
  url: "https://api.example.com",
  method: "GET",
});
```

The build-time validator also catches these via TypeScript's type-checker, including `globalThis.fetch`-style access. If you shadow a restricted name with your own variable (e.g. `const fetch = myCustomFunction`), the validator correctly ignores it.

### Available Runtime APIs

The SDK provides type definitions for all APIs that **are** available in the QuickJS/WASM runtime:

- **Text encoding:** `TextEncoder`, `TextDecoder`
- **Binary data:** `Buffer` (with `alloc`, `from`, `concat`, etc.)
- **Base64:** `atob()`, `btoa()`
- **URLs:** `URL`, `URLSearchParams`
- **Console:** `console.log()`, `.warn()`, `.error()`, `.info()`, `.debug()`
- **Utilities:** `Math.random()` (overridden with seeded ChaCha8 for determinism)

These are declared in `global.d.ts` and automatically available when you import `@chainlink/cre-sdk`.

### The `--skip-type-checks` Flag

The CRE CLI exposes a `--skip-type-checks` flag on the `compile` command. Use it when you need to compile a workflow that has TypeScript errors you're willing to accept:

```bash
# Normal compilation — type check + runtime validation + build
cre compile src/workflow.ts

# Skip TypeScript type checking only
cre compile src/workflow.ts --skip-type-checks
```

**What `--skip-type-checks` does:**

- Skips the TypeScript type checker (`tsc`) — your tsconfig errors won't block compilation.

**What `--skip-type-checks` does NOT do:**

- It does **not** skip the runtime compatibility validation. Imports of restricted Node.js modules (`node:crypto`, `node:fs`, etc.) and usage of unavailable globals (`fetch`, `setTimeout`, etc.) will **always** block compilation, because these would cause runtime failures in the WASM sandbox.

```bash
# This workflow imports node:crypto — compilation fails regardless of the flag:
$ cre compile src/bad-workflow.ts --skip-type-checks

# ⚠️  Skipping TypeScript checks (--skip-type-checks)
# ❌ Unsupported API usage found in workflow source.
# CRE workflows run on Javy (QuickJS), not full Node.js.
# - src/bad-workflow.ts:1:25 'node:crypto' is not available in CRE workflow runtime.
```

#### SDK internals

Under the hood, the SDK's `cre-compile` binary (`bin/cre-compile.ts`) parses the flag and passes it through the compilation pipeline. The flag controls whether `assertWorkflowTypecheck()` runs, while `assertWorkflowRuntimeCompatibility()` always executes regardless. The CRE CLI invokes this binary, so the flag semantics are identical whether you run `cre compile --skip-type-checks` or call the SDK's compilation API directly.

## Contributing & Development

This monorepo uses:

- **[Bun](https://bun.sh/)** - Package manager and TypeScript runtime
- **[Biome](https://github.com/biomejs/biome)** - Formatting and linting
- **[Javy](https://github.com/bytecodealliance/javy)** - WebAssembly compilation

### Setup for Contributors

```bash
# Clone with submodules (for protobuf definitions)
git clone --recursive https://github.com/smartcontractkit/cre-sdk-typescript
cd cre-sdk-typescript

# Install dependencies
bun install

# Build packages and perform full health checks
bun full-checks
```

### Available Scripts

```bash
# Development
bun build                 # Build all packages using turbo
bun check                 # Format and lint code using biome
bun format                # Format code using biome
bun lint                  # Lint code using biome
bun typecheck             # Type check all packages
bun full-checks           # Build packages and perform full health checks

# Package-specific builds (run from packages/cre-sdk/)
bun generate:proto        # Generate types from protobuf
bun generate:chain-selectors  # Update chain selector types
bun generate:sdk          # Generate all SDK types and code
```

For detailed development setup, see individual package READMEs:

- [CRE SDK Development](./packages/cre-sdk/README.md#building-from-source)
- [Javy Plugin Development](./packages/cre-sdk-javy-plugin/README.md#build-from-source)

## Submodules

This project uses Git submodules for external dependencies:

```bash
# Clone with submodules
git clone --recursive https://github.com/smartcontractkit/cre-sdk-typescript

# Or initialize submodules after cloning
git submodule update --init --recursive

# Update submodules to latest
git submodule update --remote
```

**Current submodules:**

- `chainlink-protos` - Protocol buffer definitions

## License

See LICENSE in individual package directories.
