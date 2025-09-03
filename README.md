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
