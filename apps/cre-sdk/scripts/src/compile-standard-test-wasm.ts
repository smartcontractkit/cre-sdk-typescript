import { $ } from "bun";
import fg from "fast-glob";

export const main = async () => {
  const args = process.argv.slice(3);

  if (args.length === 0) {
    console.error("Usage: bun test:standard:compile:wasm <standard-test-name>");
    console.error(
      "       bun test:standard:compile:wasm <directory> <standard-test-name>"
    );
    console.error("Examples:");
    console.error(
      "  Single: bun test:standard:compile:wasm capability_calls_are_async"
    );
    console.error(
      "  Nested: bun test:standard:compile:wasm mode_switch don_runtime_in_node_mode"
    );
    process.exit(1);
  }

  let jsFile: string;
  let buildCommand: string;

  if (args.length === 1) {
    // Single parameter - standard test name
    const standardTestName = args[0];
    console.info(`🔨 Compiling standard test to WASM: ${standardTestName}`);
    jsFile = `.temp/standard_tests/${standardTestName}/test.js`;
    // Build command prepared for potential error message
    buildCommand = `bun test:standard:compile:js ${standardTestName}`;
  } else if (args.length === 2) {
    // Two parameters - first is directory, second is nested standard test
    const directory = args[0];
    const standardTestName = args[1];
    console.info(
      `🔨 Compiling nested standard test to WASM: ${directory}/${standardTestName}`
    );
    jsFile = `.temp/standard_tests/${directory}/${standardTestName}/test.js`;
    // Build command prepared for potential error message
    buildCommand = `bun test:standard:compile:js ${directory} ${standardTestName}`;
  } else {
    console.error("❌ Too many arguments provided");
    process.exit(1);
  }

  const wasmFile = jsFile.replace(/\.js$/, ".wasm");

  // Check if the JS file exists
  const jsFiles = fg.sync(jsFile);
  if (jsFiles.length === 0) {
    console.error(`❌ No JS file found: ${jsFile}`);
    console.error(`Make sure to build the test first with: ${buildCommand}`);
    process.exit(1);
  }

  console.info(`📁 Found: ${jsFile}`);
  console.info(`🎯 Output: ${wasmFile}`);

  /**
   * -C wit=src/workflows/workflow.wit — points to the WIT file (definition of what will be available for the Host).
   * -C wit-world=workflow — specifies the WIT world name (world "workflow" which is defined in the .wit file).
   * -C plugin=... — uses your custom runtime (bundled javy chainlink sdk plugin)
   */
  // await $`bun javy build -C wit=src/workflows/workflow.wit -C wit-world=workflow -C plugin=dist/javy-chainlink-sdk.plugin.wasm ${jsFile} -o ${wasmFile}`;
  await $`bun cre-compile-workflow ${jsFile} ${wasmFile}`;

  console.info(`✅ Compiled: ${wasmFile}`);
};
