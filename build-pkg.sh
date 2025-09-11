bun build --target=node --entrypoints ./src/sdk/index.ts ./src/sdk/utils/index.ts ./src/sdk/runtime/index.ts --outdir=dist 

sh build-bins.sh

cp bin/* dist/bin/
cp bin/cre-ts dist/bin

chmod +x dist/bin/cre-ts
chmod +x dist/bin/cre-build-darwin-arm64 

bun tsc --emitDeclarationOnly --project tsconfig.types.json
bun rimraf tsconfig.types.tsbuildinfo 

cp package.json dist/package.json