# @chainlink/cre-sdk-javy-plugin

WebAssembly compilation tools for Chainlink CRE SDK workflows using [Javy](https://github.com/bytecodealliance/javy).

This package enables compiling TypeScript/JavaScript workflows to WebAssembly for execution in the Chainlink Runtime Environment. It provides the Javy plugin that exposes CRE host functions to guest workflows.

## Installation

```bash
bun add @chainlink/cre-sdk-javy-plugin
```

## Quick Start

**Note:** Most users will use the main `@chainlink/cre-sdk` package which includes compilation tools.

```bash
# Install the main SDK (includes this package)
bun add @chainlink/cre-sdk

# One-time setup: download Javy binary and compile plugin
bun x cre-setup

# Compile your workflow to WebAssembly
bun x cre-compile src/workflow.ts dist/workflow.wasm
```

## Usage

### Standalone Usage

If using this package directly (without the main SDK):

1. **Install the package**

   ```bash
   bun add @chainlink/cre-sdk-javy-plugin
   ```

2. **Setup (one-time)**

   ```bash
   bun x cre-setup
   ```

   This downloads the appropriate Javy binary for your OS and compiles the CRE plugin.

3. **Compile workflows**
   ```bash
   bun x cre-compile-workflow <input.js> <output.wasm>
   ```

### Example

```bash
# With main SDK (typical usage)
bun x cre-compile src/hello-world.ts dist/hello-world.wasm

# Standalone (using this package directly)
bun x cre-compile-workflow src/hello-world.js dist/hello-world.wasm
```

## Javy Setup & Troubleshooting

### macOS

The repo includes pre-compiled Javy binaries. If you encounter Apple security issues:

```bash
# Remove quarantine attribute
xattr -d com.apple.quarantine ./bin/javy-arm-macos-v5.0.4

# Make executable
chmod +x ./bin/javy-arm-macos-v5.0.4

# Verify installation
./bin/javy-arm-macos-v5.0.4 --version
```

### Linux

```bash
# Make executable
chmod +x ./bin/javy-arm-linux-v5.0.4

# Verify installation
./bin/javy-arm-linux-v5.0.4 --version
```

### Plugin Architecture

The Javy Chainlink SDK plugin exposes host functions to guest workflows:

- **Static Linking**: Plugin is compiled into the final WASM (current approach)
- **Dynamic Loading**: Runtime plugin discovery (future enhancement)

## Build from Source

### Prerequisites

- Rust toolchain with `wasm32-wasip1` target
- Bun >= 1.2.21

```bash
# Install Rust WASM target
rustup target add wasm32-wasip1

# Install wasm-tools for debugging
cargo install --locked wasm-tools
```

### Building

```bash
# Build the plugin
bun run build

# Or manually build the Rust plugin
cd src/javy_chainlink_sdk
cargo build --target wasm32-wasip1 --release
```

### Build Output

After building, you'll find:

- `dist/javy_chainlink_sdk.wasm` - The compiled plugin
- `dist/workflow.wit` - WebAssembly Interface Types definitions

### Debugging Compiled WASM

Use `wasm-tools` to inspect compiled workflows:

```bash
# Validate a compiled workflow
wasm-tools component targets --world workflow src/workflow.wit dist/workflow.wasm

# Print WASM structure
wasm-tools print dist/workflow.wasm
```

## Configuration

The plugin uses these configuration files:

- `src/javy_chainlink_sdk/Cargo.toml` - Rust dependencies and build config
- `src/workflow.wit` - WebAssembly Interface Types for CRE workflows
- `bin/compile-workflow.ts` - Workflow compilation logic
- `bin/setup.ts` - One-time setup script

## Compatibility

- **Javy Version**: v5.0.4
- **Rust Edition**: 2021
- **WASM Target**: `wasm32-wasip1`
- **Node Runtime**: Bun >= 1.2.21

## Development

### Project Structure

```
src/
├── javy_chainlink_sdk/     # Rust plugin source
│   ├── src/lib.rs         # Plugin implementation
│   └── Cargo.toml         # Rust dependencies
├── workflow.wit           # WASM interface definitions
bin/
├── setup.ts              # Setup script
└── compile-workflow.ts   # Compilation script
```

### Testing

```bash
# Run plugin tests
cd src/javy_chainlink_sdk
cargo test

# Test compilation with example workflow (requires @chainlink/cre-sdk installed)
bun x cre-compile examples/hello-world.ts test-output.wasm

# Or with standalone binary
bun x cre-compile-workflow examples/hello-world.js test-output.wasm
```

### Contributing

1. Make changes to the Rust plugin in `src/javy_chainlink_sdk/`
2. Build and test: `bun run build`
3. Test compilation: `bun x cre-compile <test-file> <output>` or `bun x cre-compile-workflow <test-file> <output>`
4. Verify WASM output via simulating with [CRE CLI](https://github.com/smartcontractkit/cre-cli).

## License

See LICENSE in LICENSE.md
