# @chainlink/cre-sdk

The Chainlink Runtime Environment (CRE) SDK for TypeScript enables developers to write decentralized [Chainlink Runtime Environment Workflows](https://docs.chain.link/cre/) in Typescript.

## Table of Contents

- [How to use this SDK](#how-to-use-this-sdk)
- [Examples](#examples)
- [Simulate locally with CRE CLI](#simulate-locally-with-cre-cli)
- [Installation](#installation)
- [Core Concepts](#core-concepts)
  - [Workflows](#workflows)
  - [Runtime Modes](#runtime-modes)
- [Available Capabilities](#available-capabilities)
  - [Scheduling](#scheduling)
  - [HTTP Operations](#http-operations)
  - [Blockchain Interactions](#blockchain-interactions)
- [Configuration & Type Safety](#configuration--type-safety)
- [Consensus & Aggregation](#consensus--aggregation)
- [Utility Functions](#utility-functions)
  - [HTTP Response Helpers](#http-response-helpers)
  - [Blockchain Helpers](#blockchain-helpers)
  - [Hex Utilities](#hex-utilities)
  - [Chain Selectors](#chain-selectors)
- [Example Workflows](#example-workflows)
  - [1. Simple Cron-scheduled task](#1-simple-cron-scheduled-task)
  - [2. API Data Aggregation](#2-api-data-aggregation)
  - [3. On-Chain Data Integration](#3-on-chain-data-integration)
  - [4. Proof of Reserve](#4-proof-of-reserve)
  - [5. Star Wars API](#5-star-wars-api)
- [API Reference](#api-reference)
  - [Core Functions](#core-functions)
  - [Capabilities](#capabilities)
  - [Utilities](#utilities)
- [Testing](#testing)
- [Building from Source](#building-from-source)
  - [Protobuf Generation](#protobuf-generation)
  - [Chain Selectors Generation](#chain-selectors-generation)
- [Requirements](#requirements)
- [License](#license)

## How to use this SDK

This package exposes the APIs you use to write CRE Workflows in TypeScript, and then compile them to WASM.

This package must be used along with the [CRE CLI tool](https://github.com/smartcontractkit/cre-cli) to deploy your WASM-compiled workflows.

## Prerequisites

1. the [bun runtime](https://bun.com/). The wasm compilation currently is only supported by the bun runtime which has near-complete NodeJS compatibility.

2. the [CRE CLI tool](https://github.com/smartcontractkit/cre-cli) installed.

## Getting Started

We recommend you consult the [getting started docs](https://docs.chain.link/cre/getting-started/cli-installation) and install the CRE CLI.

Then run `cre init`, name your project and choose TypeScript as the language to define your workflows in.

## Examples

This TypeScript CRE SDK also includes some reference examples - [cre-sdk-examples](https://github.com/smartcontractkit/cre-sdk-typescript/tree/main/packages/cre-sdk-examples). These can be copied and pasted into your project as needed.

⚠️ Note however that these are refence TypeScript workflows and may require some additional steps (having the CRE CLI installed, running `bun x cre-setup` from inside a workflow example directory, etc) to get them to work within this repo.

**We recommend you setup your project using the CRE CLI and then copy and paste these examples into your project**

## Simulate locally with CRE CLI

You can run and debug your TypeScript workflows locally using [the CRE CLI's](https://github.com/smartcontractkit/cre-cli) simulation functionality.

Make sure you `cd` into the directory that contain's your workflow's TypeScript file and the associated `config.json`. Then:

```bash
cre workflow simulate --target local-simulation --config config.json index.ts
```

When simulating workflows that write to the blockchain, remember to pass extra flag `--broadcast` to broadcast the transactions to the blockchain.

See the CLI docs for additional flags (e.g. config file, secrets, HTTP payloads, EVM log params).

## Installation

```bash
bun add @chainlink/cre-sdk
```

## Core Concepts

### Workflows

Workflows are the fundamental building blocks of CRE applications. They define how your application responds to triggers and what actions to take. Each workflow consists of:

- **Triggers**: Events that initiate workflow execution (cron schedules, HTTP requests, etc.)
- **Handlers**: Functions that process trigger events and execute your business logic as provided in a callback function.
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
  type HTTPSendRequester,
  type Runtime,
  ok,
  text,
} from "@chainlink/cre-sdk";

type Config = { apiUrl: string };

const fetchData = (sendRequester: HTTPSendRequester, config: Config) => {
  const response = sendRequester
    .sendRequest({ url: config.apiUrl, method: "GET" })
    .result();

  if (!ok(response)) {
    throw new Error(`HTTP request failed with status: ${response.statusCode}`);
  }

  return Number.parseFloat(text(response));
};

const onCronTrigger = (runtime: Runtime<Config>) => {
  const httpCapability = new cre.capabilities.HTTPClient();
  return httpCapability
    .sendRequest(runtime, fetchData, consensusMedianAggregation())(
      runtime.config,
    )
    .result();
};
```

### Blockchain Interactions

Read from and write to EVM-compatible blockchains:

```typescript
import {
  bytesToHex,
  cre,
  encodeCallMsg,
  getNetwork,
  LAST_FINALIZED_BLOCK_NUMBER,
  type Runtime,
} from "@chainlink/cre-sdk";
import {
  type Address,
  decodeFunctionResult,
  encodeFunctionData,
  zeroAddress,
} from "viem";

type Config = { evm: { chainSelectorName: string; contractAddress: string } };

const onCronTrigger = (runtime: Runtime<Config>) => {
  const { chainSelectorName, contractAddress } = runtime.config.evm;
  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName,
    isTestnet: true,
  });
  if (!network) throw new Error("Network not found");

  const evmClient = new cre.capabilities.EVMClient(
    network.chainSelector.selector,
  );

  // Read from blockchain
  const callData = encodeFunctionData({
    abi: CONTRACT_ABI,
    functionName: "getValue",
  });

  const contractCall = evmClient
    .callContract(runtime, {
      call: encodeCallMsg({
        from: zeroAddress,
        to: contractAddress as Address,
        data: callData,
      }),
      blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
    })
    .result();

  const onchainValue = decodeFunctionResult({
    abi: CONTRACT_ABI,
    functionName: "getValue",
    data: bytesToHex(contractCall.data),
  });

  runtime.log(`Successfully read onchain value: ${onchainValue}`);
  return onchainValue;
};
```

## Configuration & Type Safety

You, the developer, must declare config files in config.json files, co-located with your TypeScript workflow definition.

Use Zod schemas for type-safe configuration.

Here's an example of zod usage for the config specified in `../cre-sdk-examples/src/workflows/on-chain/config.json`

```typescript
import { z } from "zod";

const configSchema = z.object({
  schedule: z.string(),
  apiUrl: z.string(),
  evms: z.array(
    z.object({
      chainSelectorName: z.string(),
      contractAddress: z.string(),
    }),
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
  consensusMedianAggregation(),
)();
```

## Utility Functions

### HTTP Response Helpers

Work with HTTP responses using convenient helper functions:

```typescript
import { ok, text, json, getHeader } from "@chainlink/cre-sdk";

const response = sendRequester
  .sendRequest({ url: "https://api.example.com" })
  .result();

// Check if response is successful (200-299 status)
if (!ok(response)) {
  throw new Error(`Request failed with status: ${response.statusCode}`);
}

// Get response as trimmed text
const responseText = text(response);

// Parse JSON response
const data = json(response);

// Get specific header
const contentType = getHeader(response, "content-type");
```

### Blockchain Helpers

Helper functions for EVM blockchain interactions:

```typescript
import {
  encodeCallMsg,
  prepareReportRequest,
  LAST_FINALIZED_BLOCK_NUMBER,
  LATEST_BLOCK_NUMBER,
} from "@chainlink/cre-sdk";
import { encodeFunctionData } from "viem";

// Encode call message for contract reads
const callMsg = encodeCallMsg({
  from: zeroAddress,
  to: contractAddress,
  data: callData,
});

// Use block number constants
const response = evmClient
  .callContract(runtime, {
    call: callMsg,
    blockNumber: LAST_FINALIZED_BLOCK_NUMBER, // or LATEST_BLOCK_NUMBER
  })
  .result();

// Prepare report for contract writes
const writeData = encodeFunctionData({
  abi: CONTRACT_ABI,
  functionName: "setValue",
  args: [value],
});

const report = runtime.report(prepareReportRequest(writeData)).result();
```

### Hex Utilities

Convert between hex and base64 formats for CRE protocol communication:

```typescript
import { hexToBase64, bytesToHex } from "@chainlink/cre-sdk";

// Hex to Base64: "0x1234567890abcdef" → "EjRWeJCrze8="
const base64Data = hexToBase64("0x1234567890abcdef");

// Bytes to Hex: Uint8Array([18, 52, 86...]) → "0x1234567890abcdef"
const hexData = bytesToHex(buffer);
```

### Chain Selectors

Access blockchain network metadata:

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

### 1. Simple Cron-scheduled task

See the [hello-world](https://github.com/smartcontractkit/cre-sdk-typescript/tree/main/packages/cre-sdk-examples/src/hello-world) example that runs a cron-based operation on CRE at intervals you define in the `config.json` file.

### 2. API Data Aggregation

See the [http-fetch example](https://github.com/smartcontractkit/cre-sdk-typescript/tree/main/packages/cre-sdk-examples/src/workflows/http-fetch) for a complete implementation that fetches data from external APIs, with Chainlink CRE consensus aggregation applied.

### 3. On-Chain Data Integration

See the [on-chain example](https://github.com/smartcontractkit/cre-sdk-typescript/tree/main/packages/cre-sdk-examples/src/workflows/on-chain) for reading from smart contracts, and the [on-chain-write example](https://github.com/smartcontractkit/cre-sdk-typescript/tree/main/packages/cre-sdk-examples/src/workflows/on-chain-write) for writing to smart contracts.

### 4. Proof of Reserve

See the [proof-of-reserve example](https://github.com/smartcontractkit/cre-sdk-typescript/tree/main/packages/cre-sdk-examples/src/workflows/proof-of-reserve) for a complete implementation demonstrating reserve validation using on-chain data verification and off-chain API integration.

### 5. Star Wars API

See the [star-wars example](https://github.com/smartcontractkit/cre-sdk-typescript/tree/main/packages/cre-sdk-examples/src/workflows/star-wars) for an easy-to-follow example, known for being the default code used in [Chainlink Functions' Playground](https://functions.chain.link/playground).

## API Reference

### Core Functions

- `Runner.newRunner<T>(options?)`: Create a new workflow runner
- `cre.handler(trigger, handler)`: Create a trigger-handler pair
- `runtime.runInNodeMode(fn, aggregator)`: Execute function in node mode with consensus

### Capabilities

- `cre.capabilities.CronCapability`: Schedule-based triggers
- `cre.capabilities.HTTPClient`: HTTP client for requests with consensus support
- `cre.capabilities.EVMClient`: EVM blockchain interactions

### Utilities

**HTTP Helpers:**

- `ok(response)`: Check if HTTP status is successful (200-299)
- `text(response)`: Get response body as trimmed text
- `json(response)`: Parse response body as JSON
- `getHeader(response, name)`: Get specific header value

**Blockchain Helpers:**

- `encodeCallMsg({ from, to, data })`: Encode call message for EVM reads
- `prepareReportRequest(hexPayload)`: Prepare report for EVM writes
- `LAST_FINALIZED_BLOCK_NUMBER`: Constant for finalized block reads
- `LATEST_BLOCK_NUMBER`: Constant for latest block reads

**Data Conversion:**

- `hexToBase64(hex)`: Convert hex string to base64
- `bytesToHex(bytes)`: Convert bytes to hex string

**Consensus:**

- `consensusMedianAggregation()`: Median consensus aggregator

**Chain Selectors:**

- `getAllNetworks()`: Get all supported networks
- `getNetwork(options)`: Get specific network metadata

## Testing

The CRE SDK includes a built-in test framework for unit testing your workflows without compiling to WASM or running on a DON. It provides capability mocks, secrets simulation, time control, and log capture — all with full type safety.

See the [Testing Guide](./TESTING.md) for full documentation, including examples for mocking EVM, HTTP, consensus, and more.

Quick example:

```typescript
import { describe, expect } from "bun:test";
import { test, newTestRuntime, EvmMock } from "@chainlink/cre-sdk/test";
import { ClientCapability as EvmClient } from "@cre/generated-sdk/capabilities/blockchain/evm/v1alpha/client_sdk_gen";

describe("my workflow", () => {
  test("reads from EVM", () => {
    const mock = EvmMock.testInstance(11155111n);
    mock.callContract = () => ({ data: "AQID" });

    const runtime = newTestRuntime();
    const result = new EvmClient(11155111n)
      .callContract(runtime, { call: { to: "", data: "" } })
      .result();

    expect(result.data).toEqual(new Uint8Array([1, 2, 3]));
  });
});
```

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
