# cre-sdk-typescript

# cre-ts-sdk

## Submodules

This project uses Git submodules to include external dependencies. After cloning the repository, you need to initialize and update the submodules:

### Initial Setup

```zsh
# Clone with submodules
git clone --recursive https://github.com/smartcontractkit/cre-sdk-typescript

# Or if already cloned without submodules
git submodule update --init --recursive
```

### Updating Submodules

When there are changes in the submodule repositories:

```zsh
# Update all submodules to their latest commits
git submodule update --remote

# Or update a specific submodule
git submodule update --remote submodules/chainlink-protos
```

### Working with Submodules

```zsh
# Check submodule status
git submodule status

# Enter a submodule directory and switch branches
cd submodules/chainlink-protos
git checkout main
git pull origin main
cd ../..
```

If you need to make changes to the submodule, it's recommended to contribute to the original repository, following all the contribution guidelines, and then once the changes are merged, update the submodule to the latest version.

Currently sdk uses submodules:

- chainlink-protos - for protobuf definitions

## Setup

This repo is using [Bun](https://bun.sh/) as the package manager and TS engine.
Use [asdf](https://asdf-vm.com/) to install the correct version, supported by the project.

```bash
asdf install
```

To install dependencies:

```zsh
bun i
```

To build everything you need in one shot:

```zsh
bun build:all
```

If this fails you may need to check your output and potentially run `"rustup target add wasm32-wasip1`.

To build just the Chainlink SDK Javy plugin:

```zsh
bun build:javy:plugin
```

To compile Javy WASM that includes the Chainlink SDK plugin:

```zsh
bun build:javy:sdk:wasm
```

To transpile TS workflow to JS:

```zsh
bun build:workflows:js
```

To compile JS workflows to WASM:

```zsh
bun build:workflows:wasm
```

## Javy

[Javy](https://github.com/bytecodealliance/javy) is a main tool that drives our TS -> Wasm compilation.

When installing it on a Mac, you might run into an error, caused by Apple's security policy. This repo contains a pre-compiled version of Javy for ARM architecture,
which is safe to run. However if you still run into issues, remove the quarantine attribute from the file:

```zsh
xattr -d com.apple.quarantine ./bin/javy-arm-macos-v5.0.4
```

Then make sure the file has execute permissions:

```zsh
chmod +x ./bin/javy-arm-macos-v5.0.4
```

Finally, verify if everything is working:

```zsh
./bin/javy-arm-macos-v5.0.4 --version
```

If you see the version number, you're good to go.
For your convenience, there's a bun script that simply exposes `bun javy` to the CLI:

```zsh
bun javy --version
```

### Javy Chainlink SDK

Javy Chainlink SDK is a plugin that exposes host functions to the guest.

To build the plugin, run:

```zsh
bun build:javy:plugin
```

or manually:

```zsh
cd plugins/javy_chainlink_sdk
cargo build --target wasm32-wasip1 --release
```

The plugin is later used to compile the Guest workflows.
**Important**: There are two options of how the plugin can be used: `dynamic` and `static`.
Currently we're using the static approach, but support for dynamic (looking for plugin at runtime) would be explored.

### Linux

Similar to the macOS instructions, for Linux you'll need:

```zsh
chmod +x ./bin/javy-arm-linux-v5.0.4
```

Verify the binary:

```zsh
./bin/javy-arm-linux-v5.0.4 --version
```

Convenience script:

```zsh
bun javy:linux --version
```

## Biome

[Biome](https://github.com/biomejs/biome) is our default formatter and linter.

To run the checks and auto-fix everything that can be auto-fixed:

```zsh
bun biome:check
```

To run just the formatter:

```zsh
bun biome:format
```

To run just the linter:

```zsh
bun biome:lint
```

## Compile to Wasm

Write your workflow and build it. Build process will generate output in `/dist`.

```zsh
bun build:all
```

This will compile the workflows to Wasm and output the files to the `dist/workflows` directory.
Build is also compiling SDK files from TS to JS and outputting them to the `dist` directory, maintaining the same structure.

### Build Output Structure

After running `bun build:all`, the following structure will be created:

```
dist/
├── workflows/          # Compiled WASM workflows
│   └── hello-world.wasm
├── sdk/               # Compiled JS SDK files
└── javy/              # Javy SDK plugin artifacts
```

## Tooling

You would need Rust installed to build the plugin.

## `wasm-tools` - for debugging content of compiled Wasm files

To install:

```zsh
cargo install --locked wasm-tools
```

Example usage (validate the hello-world workflow):

```zsh
wasm-tools component targets --world workflow src/workflows/workflow.wit dist/workflows/hello-world.wasm
```

## Protobuf Generation

This project uses [ts-proto](https://github.com/stephenh/ts-proto) for generating TypeScript types from Protocol Buffers.

### Prerequisites

`buf` is managed via bunx from dev dependencies, so only prerequisite is that you've run `bun install` before attempting to run proto related commands.

### Available Commands

- `bun proto:generate` - Generate TypeScript types from .proto files
- `bun proto:lint` - Lint .proto files
- `bun proto:format` - Format .proto files

### Configuration

- **buf.yaml** - Main buf configuration
- **buf.gen.yaml** - Code generation configuration using ts-proto
- **.tool-versions** - Version management for bun only
- **package.json** - buf version managed as dev dependency

Generated files are placed in `src/generated/`.

# Generated Chain Selectors

This directory contains auto-generated TypeScript files for Chainlink Chain Selectors.

## Overview

The chain selectors are automatically generated from the official [Chainlink chain-selectors repository](https://github.com/smartcontractkit/chain-selectors) YAML files. The repository is installed as a dev dependency, ensuring consistent builds without network dependencies.

## Structure

### Individual Network Files

Each network has its own TypeScript file organized by blockchain family:

```
src/generated/chain-selectors/
├── evm/
│   ├── ethereum-mainnet.ts
│   ├── ethereum-mainnet-optimism-1.ts
│   ├── polygon-mainnet.ts
│   └── ... (231 EVM networks)
├── solana/
│   ├── solana-mainnet.ts
│   ├── solana-testnet.ts
│   └── solana-devnet.ts
├── aptos/
│   ├── aptos-mainnet.ts
│   ├── aptos-testnet.ts
│   └── aptos-localnet.ts
├── sui/
├── ton/
└── tron/
```

Each file exports a single network configuration:

```typescript
// src/generated/chain-selectors/evm/ethereum-mainnet.ts
export default {
  chainId: "1",
  chainSelector: {
    name: "ethereum-mainnet",
    selector: "5009297550715158000",
  },
  chainFamily: "evm",
};
```

### Networks Array

All networks are also available as a single array:

```typescript
// src/generated/networks.ts
export const ALL_NETWORKS: NetworkInfo[] = [
  // ... all 247 networks
];
```

## Usage

### Direct Import of Specific Networks

```typescript
import ethereumMainnet from "./generated/chain-selectors/evm/ethereum-mainnet";
import solanaMainnet from "./generated/chain-selectors/solana/solana-mainnet";

console.log(ethereumMainnet.chainSelector.name); // "ethereum-mainnet"
console.log(solanaMainnet.chainSelector.selector); // "124615329519749600"
```

### Using Utility Functions

```typescript
import {
  getAllNetworks,
  getNetworkBySelector,
  getNetworksByFamily,
  getNetworkByFamilyAndChainId,
  getNetworkByChainSelectorName,
} from "./sdk/utils/chain-selectors";

// Get network by selector
const network = getNetworkBySelector("5009297550715158000");

// Get network by name
const ethereum = getNetworkByChainSelectorName("ethereum-mainnet");

// Get network by family and chain ID
const evmNetwork = getNetworkByFamilyAndChainId("evm", "1");

// Get all networks for a family
const evmNetworks = getNetworksByFamily("evm");

// Get all networks
const allNetworks = getAllNetworks();
```

## Supported Blockchain Families

- **EVM**: 231 networks - Ethereum Virtual Machine compatible chains
- **Solana**: 3 networks - Solana networks
- **Aptos**: 3 networks - Aptos networks
- **Sui**: 3 networks - Sui networks
- **TON**: 3 networks - TON networks
- **Tron**: 4 networks - Tron networks

## Regenerating

To update with the latest chain selectors:

```bash
bun generate:chain-selectors
```

This will:

1. Read the local YAML files from the chain-selectors dev dependency
2. Generate individual network files organized by blockchain family
3. Create the main networks array file
4. Generate utility functions
5. Format the output with Biome

To update to the latest chain selectors, update the dependency:

```bash
bun update chain-selectors
bun generate:chain-selectors
```

## Key Features

- **Individual Files**: Each network has its own importable file
- **Family Organization**: Networks organized by blockchain family directories
- **Type Safety**: All data structures are fully typed with TypeScript
- **Tree Shaking**: Import only the networks you need
- **Offline Builds**: No internet required during generation
- **Consistent Builds**: Locked to specific dependency version

## Files Generated

- `chain-selectors/[family]/[network-name].ts` - Individual network files
- `networks.ts` - Array of all networks
- Utility functions in `src/sdk/utils/chain-selectors/`

## Source Data

The generator reads data from these YAML files in the local chain-selectors dependency:

- `selectors.yml` - EVM chains
- `selectors_solana.yml` - Solana networks
- `selectors_aptos.yml` - Aptos networks
- `selectors_sui.yml` - Sui networks
- `selectors_ton.yml` - TON networks
- `selectors_tron.yml` - Tron networks

All files are sourced from the official [Chainlink chain-selectors repository](https://github.com/smartcontractkit/chain-selectors).
