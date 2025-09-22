# @chainlink/cre-sdk

The Chainlink Runtime Environment (CRE) SDK for TypeScript enables developers to build decentralized workflows that combine off-chain computation with on-chain execution. Create workflows that fetch data from APIs, interact with smart contracts, and coordinate complex multi-step operations across blockchain networks.

## Installation

```bash
bun add @chainlink/cre-sdk
```

## Quick Start

```typescript
import { cre, Value, withErrorBoundary } from "@chainlink/cre-sdk";

const onCronTrigger = async (config: { schedule: string }) => {
  // Your workflow logic here
  cre.sendResponseValue(Value.from("Hello, CRE!"));
};

const initWorkflow = (config: { schedule: string }) => {
  const cron = new cre.capabilities.CronCapability();
  return [
    cre.handler(cron.trigger({ schedule: config.schedule }), onCronTrigger),
  ];
};

export async function main() {
  const runner = await cre.newRunner<{ schedule: string }>();
  await runner.run(initWorkflow);
}

withErrorBoundary(main);
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

Use `cre.runInNodeMode()` to execute functions that require individual node processing, such as fetching data from different sources for consensus aggregation.

### Error Handling

Always wrap your main function with `withErrorBoundary()` to ensure proper error handling and workflow termination:

```typescript
withErrorBoundary(main);
```

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
import { cre, consensusMedianAggregation } from "@chainlink/cre-sdk";

const fetchData = async (config: { apiUrl: string }) => {
  const response = await cre.utils.fetch({ url: config.apiUrl });
  return Number.parseFloat(response.body.trim());
};

// Execute with consensus across multiple nodes
const result = await cre.runInNodeMode(
  fetchData,
  consensusMedianAggregation()
)(config);
```

### Blockchain Interactions

Read from and write to EVM-compatible blockchains:

```typescript
import { cre, hexToBase64 } from "@chainlink/cre-sdk";
import { encodeFunctionData, decodeFunctionResult } from "viem";

// Initialize EVM client with chain selector
const evmClient = new cre.capabilities.EVMClient(
  undefined, // default mode
  BigInt("5009297550715157269") // Ethereum Sepolia
);

// Read from contract
const callData = encodeFunctionData({
  abi: CONTRACT_ABI,
  functionName: "getValue",
});

const result = await evmClient.callContract({
  call: {
    from: hexToBase64("0x0000000000000000000000000000000000000000"),
    to: hexToBase64(contractAddress),
    data: hexToBase64(callData),
  },
  blockNumber: {
    absVal: Buffer.from([3]).toString("base64"), // finalized block
    sign: "-1",
  },
});

// Write to contract
await evmClient.writeReport({
  receiver: contractAddress,
  report: {
    rawReport: callData,
  },
});
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
      chainSelector: z.string(),
      contractAddress: z.string(),
    })
  ),
});

type Config = z.infer<typeof configSchema>;

export async function main() {
  const runner = await cre.newRunner<Config>({ configSchema });
  await runner.run(initWorkflow);
}
```

## Consensus & Aggregation

CRE provides built-in consensus mechanisms for aggregating data from multiple nodes:

```typescript
import { consensusMedianAggregation } from "@chainlink/cre-sdk";

// Execute function across multiple nodes and aggregate results
const aggregatedValue = await cre.runInNodeMode(
  fetchDataFunction,
  consensusMedianAggregation()
)(config);
```

## Utility Functions

### Value Serialization

```typescript
import { Value } from "@chainlink/cre-sdk";

// Send structured response data
cre.sendResponseValue(
  Value.from({
    price: 1234.56,
    timestamp: Date.now(),
    source: "api.example.com",
  })
);
```

### Hex Utilities

```typescript
import { hexToBase64, bytesToHex } from "@chainlink/cre-sdk";

const base64Data = hexToBase64("0x1234567890abcdef");
const hexData = bytesToHex(buffer);
```

### Chain Selectors

```typescript
import { getAllNetworks, getNetwork } from "@chainlink/cre-sdk";

const networks = getAllNetworks();
const ethereum = getNetwork("ethereum-mainnet");
```

## Example Workflows

### 1. Simple Scheduled Task

```typescript
import { cre, Value, withErrorBoundary } from "@chainlink/cre-sdk";

const onCronTrigger = () => {
  console.log("Workflow executed!");
  cre.sendResponseValue(Value.from("Task completed"));
};

const initWorkflow = (config: { schedule: string }) => {
  const cron = new cre.capabilities.CronCapability();
  return [
    cre.handler(cron.trigger({ schedule: config.schedule }), onCronTrigger),
  ];
};

export async function main() {
  const runner = await cre.newRunner<{ schedule: string }>();
  await runner.run(initWorkflow);
}

withErrorBoundary(main);
```

### 2. API Data Aggregation

```typescript
import {
  cre,
  consensusMedianAggregation,
  Value,
  withErrorBoundary,
} from "@chainlink/cre-sdk";
import { z } from "zod";

const configSchema = z.object({
  schedule: z.string(),
  apiUrl: z.string(),
});

type Config = z.infer<typeof configSchema>;

const fetchPrice = async (config: Config) => {
  const response = await cre.utils.fetch({ url: config.apiUrl });
  return Number.parseFloat(response.body.trim());
};

const onCronTrigger = async (config: Config) => {
  const price = await cre.runInNodeMode(
    fetchPrice,
    consensusMedianAggregation()
  )(config);

  cre.sendResponseValue(Value.from({ price }));
};

const initWorkflow = (config: Config) => {
  const cron = new cre.capabilities.CronCapability();
  return [
    cre.handler(cron.trigger({ schedule: config.schedule }), onCronTrigger),
  ];
};

export async function main() {
  const runner = await cre.newRunner<Config>({ configSchema });
  await runner.run(initWorkflow);
}

withErrorBoundary(main);
```

### 3. On-Chain Data Integration

```typescript
import {
  cre,
  consensusMedianAggregation,
  Value,
  withErrorBoundary,
  hexToBase64,
  bytesToHex,
} from "@chainlink/cre-sdk";
import { encodeFunctionData, decodeFunctionResult, zeroAddress } from "viem";
import { z } from "zod";

const configSchema = z.object({
  schedule: z.string(),
  apiUrl: z.string(),
  evms: z.array(
    z.object({
      chainSelector: z.string(),
      contractAddress: z.string(),
    })
  ),
});

type Config = z.infer<typeof configSchema>;

const fetchOffchainData = async (config: Config) => {
  const response = await cre.utils.fetch({ url: config.apiUrl });
  return Number.parseFloat(response.body.trim());
};

const onCronTrigger = async (config: Config) => {
  // Get off-chain data with consensus
  const offchainValue = await cre.runInNodeMode(
    fetchOffchainData,
    consensusMedianAggregation()
  )(config);

  // Read on-chain data
  const evmConfig = config.evms[0];
  const evmClient = new cre.capabilities.EVMClient(
    undefined,
    BigInt(evmConfig.chainSelector)
  );

  const callData = encodeFunctionData({
    abi: [
      {
        name: "getValue",
        type: "function",
        inputs: [],
        outputs: [{ type: "uint256" }],
      },
    ],
    functionName: "getValue",
  });

  const contractCall = await evmClient.callContract({
    call: {
      from: hexToBase64(zeroAddress),
      to: hexToBase64(evmConfig.contractAddress),
      data: hexToBase64(callData),
    },
    blockNumber: {
      absVal: Buffer.from([3]).toString("base64"),
      sign: "-1",
    },
  });

  const onchainValue = decodeFunctionResult({
    abi: [
      {
        name: "getValue",
        type: "function",
        inputs: [],
        outputs: [{ type: "uint256" }],
      },
    ],
    functionName: "getValue",
    data: bytesToHex(contractCall.data),
  });

  // Combine and return results
  const finalResult = Number(onchainValue) + offchainValue;

  cre.sendResponseValue(
    Value.from({
      offchainValue,
      onchainValue: Number(onchainValue),
      finalResult,
    })
  );
};

const initWorkflow = (config: Config) => {
  const cron = new cre.capabilities.CronCapability();
  return [
    cre.handler(cron.trigger({ schedule: config.schedule }), onCronTrigger),
  ];
};

export async function main() {
  const runner = await cre.newRunner<Config>({ configSchema });
  await runner.run(initWorkflow);
}

withErrorBoundary(main);
```

## API Reference

### Core Functions

- `cre.newRunner<T>(options?)`: Create a new workflow runner
- `cre.handler(trigger, handler)`: Create a trigger-handler pair
- `cre.sendResponseValue(value)`: Send workflow response
- `cre.runInNodeMode(fn, aggregator)`: Execute function in node mode with consensus
- `withErrorBoundary(fn)`: Wrap function with error handling

### Capabilities

- `cre.capabilities.CronCapability`: Schedule-based triggers
- `cre.capabilities.HTTPCapability`: HTTP request handling
- `cre.capabilities.HTTPClient`: HTTP client for requests
- `cre.capabilities.EVMClient`: EVM blockchain interactions

### Utilities

- `cre.utils.fetch()`: HTTP requests with consensus support
- `Value.from()`: Serialize response values
- `consensusMedianAggregation()`: Median consensus aggregator
- `hexToBase64()`, `bytesToHex()`: Data format conversions

## Building from Source

To build the SDK locally:

```bash
# Install dependencies
bun install

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

This SDK uses [ts-proto](https://github.com/stephenh/ts-proto) for generating TypeScript types from Protocol Buffers.

**Available Commands:**

- `bun generate:proto` - Generate TypeScript types from .proto files
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

const ethereum = getNetwork("ethereum-mainnet");
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

---

For more examples and advanced usage patterns, check out the [examples package](../cre-sdk-examples) in this monorepo.
