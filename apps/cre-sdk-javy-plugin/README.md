# CRE SDK Javy Plugin

TypeScript SDK for CRE is using [Javy](https://github.com/bytecodealliance/javy) as a way to compile TypeScript workflows to WebAssembly. This package contains the source code and the distribution binary for the Javy plugin which adds the support for Chainlink CRE SDK.

Current version of the plugin is compatible with [Javy v5.0.4](https://github.com/bytecodealliance/javy/releases/tag/v5.0.4).

## Usage

This package is part of the [CRE TypeScript SDK](https://github.com/smartcontractkit/cre-sdk-typescript), which is already configured to use it.

If you want to use it in your project, you can add it as a dependency with the following commands:

1. `npm add @chainlink/cre-sdk-javy-plugin` - adds the package as a dependency to your project.
2. `npx cre-setup` - one-time setup command to download the Javy binary matching your operating system and compile the plugin.

Once that is done you can start using `npx cre-compile-workflow` to compile your workflows to WebAssembly.

3. `npx cre-compile-workflow <input.js> <output.wasm>` - concrete example: `npx cre-compile-workflow src/hello-world.js dist/hello-world.wasm` (this will compile your javascript source file located in `src` directory and save the output wasm file in `dist` directory of your project).

## Build

When contributing to the project, you can build the plugin after making your changes with the following command:

```bash
npm run build
```
