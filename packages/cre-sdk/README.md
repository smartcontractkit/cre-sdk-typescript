# @chainlink/cre-sdk

The Chainlink Runtime Environment (CRE) SDK for TypeScript enables developers to build decentralized workflows that combine off-chain computation with on-chain execution. Create workflows that fetch data from APIs, interact with smart contracts, and coordinate complex multi-step operations across blockchain networks.

## Examples

Ready to clone repo with example workflows and cre-sdk set up: [cre-sdk-examples](https://github.com/smartcontractkit/cre-sdk-typescript/tree/main/packages/cre-sdk-examples).

## Simulate locally with CRE CLI

You can run and debug your TypeScript workflows locally using the CRE CLI simulation:

```bash
cre workflow simulate --target local-simulation --config config.json your-workflow-file.ts
```

See the CLI docs for additional flags (e.g. config file, secrets, HTTP payloads, EVM log params).

## Installation

```bash
bun add @chainlink/cre-sdk
```

## Quick Start

```typescript
import { cre, Runner, type Runtime } from "@chainlink/cre-sdk";

type Config = { schedule: string };

const onCronTrigger = (runtime: Runtime<Config>) => {
  runtime.log("Hello, CRE!");
  return "Hello, CRE!";
};

const initWorkflow = (config: Config) => {
  const cron = new cre.capabilities.CronCapability();
  return [
    cre.handler(cron.trigger({ schedule: config.schedule }), onCronTrigger),
  ];
};

export async function main() {
  const runner = await Runner.newRunner<Config>();
  await runner.run(initWorkflow);
}

main();
```

## Core Concepts

### Workflows

Workflows are the fundamental building blocks of CRE applications. They define how your application responds to triggers and what actions to take. Each workflow consists of:

- **Triggers**: Events that initiate workflow execution (cron schedules, HTTP requests, etc.)
- **Handlers**: Functions that process trigger events and execute your business logic
- **Capabilities**: Built-in services for interacting with external systems

### Runtime Modes

CRE supports two execution modes:

- **DON Mode**: Distributed execution across multiple nodes for consensus and reliability
- **Node Mode**: Individual node execution for specific tasks requiring node-level operations

Use `runtime.runInNodeMode()` to execute functions that require individual node processing, such as fetching data from different sources for consensus aggregation.

The SDK wires runtime safety internally; you can call `main()` directly as shown in the examples.

## Available Capabilities

### Scheduling

Execute workflows on a schedule using cron expressions:

```typescript
import { cre } from "@chainlink/cre-sdk";

const cron = new cre.capabilities.CronCapability();
const trigger = cron.trigger({ schedule: "0 */5 * * * *" }); // Every 5 minutes
```

### HTTP Operations

Fetch data from external APIs with built-in consensus mechanisms:

```typescript
import {
  cre,
  consensusMedianAggregation,
  type NodeRuntime,
  type Runtime,
} from "@chainlink/cre-sdk";

type Config = { apiUrl: string };

const fetchData = async (nodeRuntime: NodeRuntime<Config>) => {
  const http = new cre.capabilities.HTTPClient();
  const response = http
    .sendRequest(nodeRuntime, { url: nodeRuntime.config.apiUrl })
    .result();
  return Number.parseFloat(Buffer.from(response.body).toString("utf-8").trim());
};

const onCronTrigger = async (runtime: Runtime<Config>) => {
  return await runtime.runInNodeMode(fetchData, consensusMedianAggregation())();
};
```

### Blockchain Interactions

Read from and write to EVM-compatible blockchains:

```typescript
import {
  bytesToHex,
  cre,
  getNetwork,
  hexToBase64,
  type Runtime,
} from "@chainlink/cre-sdk";
import { decodeFunctionResult, encodeFunctionData, zeroAddress } from "viem";

type Config = { evm: { chainSelectorName: string; contractAddress: string } };

const onCronTrigger = async (runtime: Runtime<Config>) => {
  const { chainSelectorName, contractAddress } = runtime.config.evm;
  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName,
    isTestnet: true,
  });
  if (!network) throw new Error("Network not found");

  const evmClient = new cre.capabilities.EVMClient(
    network.chainSelector.selector
  );

  const callData = encodeFunctionData({
    abi: CONTRACT_ABI,
    functionName: "getValue",
  });

  const contractCall = evmClient
    .callContract(runtime, {
      call: {
        from: hexToBase64(zeroAddress),
        to: hexToBase64(contractAddress),
        data: hexToBase64(callData),
      },
      blockNumber: { absVal: Buffer.from([3]).toString("base64"), sign: "-1" },
    })
    .result();

  const onchainValue = decodeFunctionResult({
    abi: CONTRACT_ABI,
    functionName: "getValue",
    data: bytesToHex(contractCall.data),
  });

  // Write example
  const writeData = encodeFunctionData({
    abi: CONTRACT_ABI,
    functionName: "setValue",
    args: [onchainValue],
  });
  const tx = evmClient
    .writeReport(runtime, {
      receiver: contractAddress,
      report: { rawReport: writeData },
    })
    .result();
  return { onchainValue, txHash: tx.txHash?.toString() };
};
```

## Configuration & Type Safety

Use Zod schemas for type-safe configuration:

```typescript
import { z } from "zod";

const configSchema = z.object({
  schedule: z.string(),
  apiUrl: z.string(),
  evms: z.array(
    z.object({
      chainSelectorName: z.string(),
      contractAddress: z.string(),
    })
  ),
});

type Config = z.infer<typeof configSchema>;

export async function main() {
  const runner = await Runner.newRunner<Config>({ configSchema });
  await runner.run(initWorkflow);
}
```

## Consensus & Aggregation

CRE provides built-in consensus mechanisms for aggregating data from multiple nodes:

```typescript
import {
  consensusMedianAggregation,
  type NodeRuntime,
  type Runtime,
} from "@chainlink/cre-sdk";

const fetchDataFunction = async (nodeRuntime: NodeRuntime<Config>) => 42;

// Execute function across multiple nodes and aggregate results
const aggregatedValue = await runtime.runInNodeMode(
  fetchDataFunction,
  consensusMedianAggregation()
)();
```

## Utility Functions

### Hex Utilities

```typescript
import { hexToBase64, bytesToHex } from "@chainlink/cre-sdk";

const base64Data = hexToBase64("0x1234567890abcdef");
const hexData = bytesToHex(buffer);
```

### Chain Selectors

```typescript
import { getAllNetworks, getNetwork } from "@chainlink/cre-sdk";

const allNetworks = getAllNetworks();
const ethereumSepolia = getNetwork({
  chainFamily: "evm",
  chainSelectorName: "ethereum-sepolia",
  isTestnet: true,
});
```

## Example Workflows

### 1. Simple Scheduled Task

```typescript
import { cre, Runner, type Runtime } from "@chainlink/cre-sdk";

type Config = { schedule: string };

const onCronTrigger = (runtime: Runtime<Config>) => {
  runtime.log("Workflow executed!");
  return "Task completed";
};

const initWorkflow = (config: Config) => {
  const cron = new cre.capabilities.CronCapability();
  return [
    cre.handler(cron.trigger({ schedule: config.schedule }), onCronTrigger),
  ];
};

export async function main() {
  const runner = await Runner.newRunner<Config>();
  await runner.run(initWorkflow);
}

main();
```

### 2. API Data Aggregation

See the [http-fetch example](https://github.com/smartcontractkit/cre-sdk-typescript/tree/main/packages/cre-sdk-examples/src/workflows/http-fetch) for a complete implementation that fetches data from external APIs with consensus aggregation.

### 3. On-Chain Data Integration

See the [on-chain example](https://github.com/smartcontractkit/cre-sdk-typescript/tree/main/packages/cre-sdk-examples/src/workflows/on-chain) for reading from smart contracts, and the [on-chain-write example](https://github.com/smartcontractkit/cre-sdk-typescript/tree/main/packages/cre-sdk-examples/src/workflows/on-chain-write) for writing to smart contracts.

## API Reference

### Core Functions

- `Runner.newRunner<T>(options?)`: Create a new workflow runner
- `cre.handler(trigger, handler)`: Create a trigger-handler pair
- `runtime.runInNodeMode(fn, aggregator)`: Execute function in node mode with consensus

### Capabilities

- `cre.capabilities.CronCapability`: Schedule-based triggers
- `cre.capabilities.HTTPCapability`: HTTP request handling
- `cre.capabilities.HTTPClient`: HTTP client for requests
- `cre.capabilities.EVMClient`: EVM blockchain interactions

### Utilities

- `consensusMedianAggregation()`: Median consensus aggregator
- `hexToBase64()`, `bytesToHex()`: Data format conversions
- `getAllNetworks()`, `getNetwork(...)`: Chain selector metadata

## Building from Source

To build the SDK locally:

```bash
# Install dependencies (from monorepo root)
bun install

# Make sure Chainlink CRE Javy Plugin is ready
bun cre-setup

# Generate protocol buffers and SDK types
bun generate:sdk

# Build the package
bun run build

# Run tests
bun test

# Run set of standard tests
bun test:standard
```

### Protobuf Generation

This SDK uses [@bufbuild/protobuf](https://www.npmjs.com/package/@bufbuild/protobuf) for generating TypeScript types from Protocol Buffers.

**Available Commands:**

- `bun generate:sdk` - Generate TypeScript types from .proto files as well as custom tailored utility classes
- `bun proto:lint` - Lint .proto files
- `bun proto:format` - Format .proto files

**Configuration:**

- `buf.yaml` - Main buf configuration
- `buf.gen.yaml` - Code generation configuration using ts-proto
- Generated files are placed in `src/generated/`

### Chain Selectors Generation

Auto-generated TypeScript files for 200+ blockchain networks from the official [Chainlink chain-selectors repository](https://github.com/smartcontractkit/chain-selectors).

**Regenerate chain selectors:**

```bash
bun generate:chain-selectors
```

**Usage:**

```typescript
import { getAllNetworks, getNetwork } from "@chainlink/cre-sdk";

const ethereum = getNetwork({
  chainFamily: "evm",
  chainSelectorName: "ethereum-mainnet",
  isTestnet: false,
});
const allNetworks = getAllNetworks();
```

**Supported Networks:**

- **EVM**: 231 networks (Ethereum, Polygon, Arbitrum, etc.)
- **Solana**: 3 networks (Mainnet, Testnet, Devnet)
- **Aptos, Sui, TON, Tron**: 3-4 networks each

## Requirements

- **Runtime**: Bun >= 1.2.21
- **Dependencies**: Viem, Zod, Protocol Buffers
- **TypeScript**: 5.9+

## License

See LICENSE in LICENSE.md
