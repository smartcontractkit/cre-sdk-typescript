bun tsc --project tsconfig.build.json
echo "Built TypeScript code"

mkdir -p dist/bin
echo "Created dist/bin directory"

cp bin/* dist/bin/
echo "Copied bin/* to dist/bin/"

cp src/workflows/workflow.wit dist/workflow.wit
echo "Copied workflow.wit to dist"

cp install.js dist/install.js
echo "Copied install.js to dist"

chmod +x dist/bin/cre-ts
echo "Made cre-ts executable"

bun rimraf tsconfig.types.tsbuildinfo 
echo "Removed tsconfig.types.tsbuildinfo"

bun pm pkg set scripts.postinstall="node ./install.js"
echo "Updated package.json with postinstall script"

cp package.json dist/package.json
echo "Copied package.json to dist"
