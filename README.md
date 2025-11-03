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
  consensusMedianAggregation()
)(config);
```

### ⛓️ Blockchain Integration

```typescript
// Read/write to any EVM chain
const evmClient = new cre.capabilities.EVMClient(
  undefined,
  BigInt("5009297550715157269") // Ethereum Sepolia
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
