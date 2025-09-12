bun run build:javy:sdk:wasm

bun build --target=node --entrypoints ./src/index.ts --outdir=dist
bun build --target=node --entrypoints ./src/sdk/index.ts --outdir=dist/sdk
bun build --target=node --entrypoints ./src/sdk/utils/index.ts --outdir=dist/sdk/utils
bun build --target=node --entrypoints ./src/sdk/runtime/index.ts --outdir=dist/sdk/runtime

sh build-bins.sh

cp bin/* dist/bin/

chmod +x dist/bin/cre-ts

bun tsc --emitDeclarationOnly --project tsconfig.types.json
bun rimraf tsconfig.types.tsbuildinfo 

cp package.json dist/package.json