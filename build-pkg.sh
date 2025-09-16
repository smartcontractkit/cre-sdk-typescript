bun run build:javy:sdk:wasm

bun tsc --project tsconfig.build.json

sh build-bins.sh

mkdir -p dist/bin

cp bin/* dist/bin/
cp install.js dist/install.js

chmod +x dist/bin/cre-ts

bun rimraf tsconfig.types.tsbuildinfo 

cp package.json dist/package.json

cd dist

bun pm pkg set scripts.postinstall="node ./install.js"