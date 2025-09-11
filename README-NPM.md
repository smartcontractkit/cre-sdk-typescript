# @chainlink/cre-sdk

[![npm version](https://badge.fury.io/js/@chainlink%2Fcre-sdk.svg)](https://badge.fury.io/js/@chainlink%2Fcre-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

The Chainlink Runtime Environment (CRE) TypeScript SDK provides all the necessary tools and primitives for building Chainlink workflows that can run both in Node.js environments and compile to WebAssembly (WASM) for execution in the Chainlink network.

## Features

- 🔧 **Complete CRE Primitives**: All the building blocks needed to create Chainlink workflows
- 🌐 **Multi-platform**: Runs in Node.js and compiles to WASM
- 🛠️ **CLI Tools**: Built-in commands for building and compiling workflows
- 📦 **TypeScript Support**: Full TypeScript definitions and IntelliSense support
- ⚡ **Capabilities**: HTTP requests, EVM blockchain interactions, Cron scheduling
- 🔐 **Secrets Management**: Secure handling of sensitive configuration
- 🎯 **Consensus**: Built-in consensus mechanisms for decentralized workflows

## Installation

```bash
npm install @chainlink/cre-sdk
```

## Quick Start

### Creating a Basic Workflow

```typescript
import { cre, handler } from '@chainlink/cre-sdk'

// Define your workflow
const myWorkflow = handler({
  async trigger() {
    // Trigger logic - when should this workflow run?
    return { runId: Date.now().toString() }
  },
  
  async execute(triggerData) {
    // Execution logic - what should happen?
    const response = await cre.utils.fetch('https://api.example.com/data')
    
    // Return the result
    cre.sendResponseValue({
      value: response.data,
      success: true
    })
  }
})

export default myWorkflow
```

### Using Capabilities

```typescript
import { cre, handler, EVMClient, HTTPClient } from '@chainlink/cre-sdk'

const workflowWithCapabilities = handler({
  async execute() {
    // HTTP requests
    const httpClient = new HTTPClient()
    const apiResponse = await httpClient.get({
      url: 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd'
    })
    
    // EVM blockchain interactions
    const evmClient = new EVMClient()
    const blockNumber = await evmClient.getBlockNumber({
      chain: 'ethereum'
    })
    
    cre.sendResponseValue({
      value: {
        ethPrice: apiResponse.ethereum.usd,
        blockNumber: blockNumber.toString()
      }
    })
  }
})
```

### Consensus and Secrets

```typescript
import { cre, handler, getSecret, val, getAggregatedValue } from '@chainlink/cre-sdk'

const consensusWorkflow = handler({
  async execute() {
    // Access secrets securely
    const apiKey = await getSecret('API_KEY')
    
    // Create values that can be used in consensus
    const priceValue = val(1800.50) // ETH price from this node
    
    // Get consensus result from all nodes
    const consensusPrice = await getAggregatedValue(priceValue)
    
    cre.sendResponseValue({
      value: { consensusPrice }
    })
  }
})
```

## CLI Usage

The SDK includes a powerful CLI for building workflows:

### Build a Single Workflow

```bash
# Build a workflow to both JavaScript and WASM
cre-build workflow my-workflow

# Build all workflows to JavaScript
cre-build js

# Build all workflows to WASM  
cre-build wasm
```

### Build Prerequisites

```bash
# Build the Javy SDK plugin (required for WASM compilation)
cre-build javy-plugin

# Build Javy with the SDK plugin
cre-build javy-sdk

# Clean build artifacts
cre-build clean
```

## API Reference

### Core Exports

- **`cre`**: Main SDK object with capabilities and utilities
- **`handler`**: Function to define workflow trigger and execution logic
- **`Runner`**: Advanced workflow runner for complex scenarios
- **`runInNodeMode`**: Utility to run workflows in Node.js mode

### Capabilities

- **`HTTPClient`**: Make HTTP requests from workflows
- **`EVMClient`**: Interact with EVM-compatible blockchains
- **`CronCapability`**: Schedule workflows with cron expressions

### Utilities

- **`val`**: Create consensus-ready values
- **`getAggregatedValue`**: Get consensus results from multiple nodes
- **`creFetch`**: HTTP fetch utility
- **`getSecret`**: Securely access secrets
- **`sendResponseValue`**: Send workflow results

## Project Structure

When building workflows, organize your project like this:

```
my-chainlink-project/
├── package.json
├── workflows/
│   ├── price-feed.ts
│   ├── nft-monitor.ts
│   └── defi-alert.ts
├── dist/           # Compiled outputs
└── config/
    └── secrets.json
```

## TypeScript Configuration

For optimal development experience, use these TypeScript settings:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext", 
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "skipLibCheck": true
  }
}
```

## Environment Support

### Node.js
- Node.js 18+ required
- Full debugging and development support
- Access to all Node.js APIs during development

### WebAssembly
- Compiles to WASM for production deployment
- Sandboxed execution environment
- Optimized for Chainlink network execution

## Advanced Features

### Custom Triggers

```typescript
import { handler, TriggerInterface } from '@chainlink/cre-sdk'

class CustomTrigger implements TriggerInterface {
  async check() {
    // Custom trigger logic
    return { shouldRun: true, data: {} }
  }
}

const advancedWorkflow = handler({
  trigger: new CustomTrigger(),
  async execute(data) {
    // Handle triggered execution
  }
})
```

### Error Handling

```typescript
import { handler } from '@chainlink/cre-sdk'

const robustWorkflow = handler({
  async execute() {
    try {
      // Workflow logic
      const result = await someRiskyOperation()
      cre.sendResponseValue({ value: result })
    } catch (error) {
      cre.sendResponseValue({ 
        error: error.message,
        success: false 
      })
    }
  }
})
```

## Best Practices

1. **Always handle errors gracefully** - Use try-catch blocks
2. **Validate inputs** - Check trigger data and configuration
3. **Use consensus for critical values** - Leverage `val()` and `getAggregatedValue()`
4. **Keep workflows focused** - One responsibility per workflow
5. **Test thoroughly** - Test in Node.js mode before compiling to WASM
6. **Secure secrets** - Never hardcode sensitive data

## Troubleshooting

### Common Issues

**WASM compilation fails**
```bash
# Ensure Javy plugin is built
cre-build javy-plugin

# Check that Rust target is installed
rustup target add wasm32-wasip1
```

**TypeScript errors**
```bash
# Check your tsconfig.json
# Ensure proper module resolution
```

**Secrets not found**
```bash
# Verify secrets configuration
# Check secret names match exactly
```

## Contributing

This SDK is part of the Chainlink ecosystem. For issues and contributions:

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/smartcontractkit/cre-sdk-typescript/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/smartcontractkit/cre-sdk-typescript/discussions)
- 📚 **Documentation**: [Chainlink Docs](https://docs.chain.link)

## License

MIT License - see [LICENSE.md](LICENSE.md) for details.

---

Built with ❤️ by [Chainlink Labs](https://chainlinklabs.com)
