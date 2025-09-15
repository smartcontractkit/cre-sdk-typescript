bun run build:javy:sdk:wasm

bun tsc --project tsconfig.build.json

sh build-bins.sh

cp bin/* dist/bin/
cp install.js dist/install.js

chmod +x dist/bin/cre-ts

bun tsc --emitDeclarationOnly --project tsconfig.types.json
bun rimraf tsconfig.types.tsbuildinfo 

cp package.json dist/package.json