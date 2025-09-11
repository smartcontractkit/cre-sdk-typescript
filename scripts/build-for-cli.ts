import { $ } from 'bun';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { parseArgs } from 'util';

const { values } = parseArgs({
  args: Bun.argv,
  options: {
    input: {
      type: 'string',
    },
    output: {
      type: 'string',
    },
  },
  strict: true,
  allowPositionals: true,
});

async function main() {
  const outputFolder = 'dist';
  const inputTSFilename = values.input || 'main.ts';
  const outputWasmFilename = values.output || 'tmp.wasm';
  const inputJSFilename = inputTSFilename.replace(/\.ts$/, '.js');
  const outputJSFilename = outputWasmFilename.replace(/\.wasm$/, '.js');
  const outputJSPath = join(outputFolder, outputJSFilename);
  const packagePath = join('node_modules', 'cre-sdk-typescript');
  const javy = join(packagePath, 'bin', 'javy-arm-macos-v5.0.4');
  const sdkPluginPath = join(packagePath, 'dist', 'javy-chainlink-sdk.plugin.wasm');
  const workflowWitPath = join(packagePath, 'src', 'workflows', 'workflow.wit');

  await mkdir(outputFolder, {recursive: true});
  await $`bun build ${inputTSFilename} --outdir=${outputFolder} --target=node --format=esm`;
  await $`bun build ${inputJSFilename} --bundle --outfile=${outputJSPath}`;
  await $`${javy} build -C wit=${workflowWitPath} -C wit-world=workflow -C plugin=${sdkPluginPath} ${outputJSPath} -o ${outputWasmFilename}`;
}

main();
