# CRE SDK Examples

This project is demonstrating how CRE TypeScript SDK works. It contains TypeScript workflows that can be compiled to WASM.

## REQUIREMENTS:

- Bun 1.2.21 installed

## Usage

Install dependencies:

```bash
bun install
```

Before first usage run the setup command. Setup will download the right Javy binary based on your operating system and will compile a version with the Chainlink CRE Javy Plugin included:

```bash
bun x cre-setup
```

## Using CRE CLI to simulate example workflows

This repository is fully compatible with the [CRE CLI](https://github.com/smartcontractkit/cre-cli). You can use the CRE CLI to simulate the example workflows it provides.

The setup is done in a way that treats `cre-sdk-examples` root directory as a CRE project root. When simulating a workflow, you pass the path to the workflow directory you want to simulate.

**Examples**:

[Hello World workflow](https://github.com/smartcontractkit/cre-sdk-typescript/blob/main/packages/cre-sdk-examples/src/workflows/hello-world/index.ts):

```zsh
cre workflow simulate ./src/workflows/hello-world
```

[Http Fetch workflow](https://github.com/smartcontractkit/cre-sdk-typescript/blob/main/packages/cre-sdk-examples/src/workflows/http-fetch/index.ts):

```zsh
cre workflow simulate ./src/workflows/http-fetch
```

[On Chain Read workflow](https://github.com/smartcontractkit/cre-sdk-typescript/blob/main/packages/cre-sdk-examples/src/workflows/on-chain/index.ts):

```zsh
cre workflow simulate ./src/workflows/on-chain
```

[On Chain Write workflow](https://github.com/smartcontractkit/cre-sdk-typescript/blob/main/packages/cre-sdk-examples/src/workflows/on-chain-write/index.ts):

```zsh
cre workflow simulate ./src/workflows/on-chain-write
```

[Proof of Reserve workflow](https://github.com/smartcontractkit/cre-sdk-typescript/blob/main/packages/cre-sdk-examples/src/workflows/proof-of-reserve/index.ts):

```zsh
cre workflow simulate ./src/workflows/proof-of-reserve
```

[Star Wars character example](https://github.com/smartcontractkit/cre-sdk-typescript/blob/main/packages/cre-sdk-examples/src/workflows/star-wars/index.ts):

```zsh
cre workflow simulate ./src/workflows/star-wars
```

## Testing workflow compilation only

If you want use the CRE SDK to compile your workflows to WASM, choose any workflow you want to compile and run the following command:

```bash
bun x cre-compile <input.ts> <output.wasm>
```

Example:

```bash
bun cre-compile src/workflows/hello-world/index.ts dist/hello-world.wasm
```
