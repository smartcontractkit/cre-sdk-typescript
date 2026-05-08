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

- `dist/javy-chainlink-sdk.plugin.wasm` - Initialized plugin (for `--plugin` / default compile)
- `dist/workflow.wit` - WebAssembly Interface Types definitions

`--cre-exports` workflow builds link **`javy_chainlink_sdk` and `cre_wasm_exports` from source** via path dependencies (`src/javy_chainlink_sdk/`, `src/cre_wasm_exports/`); those directories are included in the published npm package.

The **uninitialized** `javy_chainlink_sdk.wasm` from `cargo` exists only under `target/` during the build and is used as input to `javy init-plugin`; it is not shipped in `dist/`.

### Deterministic initialized plugin (`build:plugin-wasm`)

`bun run build:plugin-wasm` (via `scripts/build-plugin-docker.sh`) produces the **initialized** plugin WASM to match `Dockerfile` (deterministic `javy init-plugin`).

| Mode | When |
|------|------|
| **Docker** (default; **canonical for committed `dist/*.wasm`**) | `docker build --platform linux/amd64` runs **`ensureJavy`** in a Bun stage, then pinned **`rust:…-slim-bookworm`** + `rust-toolchain.toml` build the plugin and `javy init-plugin --deterministic`. **Javy is never compiled from source.** Repo CI uses this path so `git diff` after `bun full-checks` stays clean. |
| **Local host only** | Set **`SKIP_DOCKER_IMAGE=1`** — `scripts/build-plugin-local.sh`: **`ensureJavy`** + host `cargo` + `init-plugin`. **Bytecode can differ** from the Docker build (different OS / LLVM / `rustc`), so do not use this for artifacts you commit unless you accept regenerating them. |

**Environment variables**

| Variable | Purpose |
|----------|---------|
| **`SKIP_DOCKER_IMAGE=1`** | Skip Docker; build on the host (machines without Docker). Not bit-identical to the Docker output. |
| **`SKIP_DOCKER_CRE_JAVY_PLUGIN_BUILD=1`** | Deprecated alias for `SKIP_DOCKER_IMAGE`; still honored in `build-plugin-docker.sh`. |
| **`CRE_JAVY_VERSION`** | Javy release tag for `ensureJavy` (default `v8.1.0`). **`JAVY_VERSION`** is a fallback for the same value when unsetting `CRE_JAVY_VERSION`. |

**Custom CI** (no Docker): Rust + `wasm32-wasip1`, Bun, then:

```dockerfile
ENV SKIP_DOCKER_IMAGE=1
```

Keep `build-plugin-local.sh` aligned with `Dockerfile` when changing the Javy version or build steps.

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
