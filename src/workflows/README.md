# Workflows

Workflows directory contains all the workflows that will be compiled to WASM.
You should only place workflow files in this directory and keep all the utils outside of it.

## WIT

WIT file defines the shape of the workflow file - basically it needs to export the `main` function.
It is used by Javy to expose `main()` function as callable for the host.

## Available Scripts

- `bun build:all` - Build all workflows and Javy plugins
- `bun build:workflows:wasm` - Build workflows to WASM only
- `bun build:workflows:js` - Build workflows to JS only
