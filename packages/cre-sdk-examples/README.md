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
bunx cre-setup
```

Then you are ready to use the CRE SDK to compile your workflows to WASM. Choose any workflow you want to compile and run the following command:

```bash
bunx cre-compile <input.ts> <output.wasm>
```

Example:

```bash
bun cre-compile src/workflows/hello-world/index.ts dist/hello-world.wasm
```
