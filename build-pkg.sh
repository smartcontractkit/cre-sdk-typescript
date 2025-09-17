
bun tsc --project tsconfig.build.json

sh build-bins.sh

# update this script so that it builds the plugin for each platform and places it in pkg/cli/[platform]/...
bun run build:javy:sdk:wasm


mkdir -p dist/bin

cp bin/* dist/bin/
cp install.js dist/install.js

chmod +x dist/bin/cre-ts

bun rimraf tsconfig.types.tsbuildinfo 

cp package.json dist/package.json

cd dist

bun pm pkg set scripts.postinstall="node ./install.js"