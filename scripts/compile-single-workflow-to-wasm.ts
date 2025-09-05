import { $ } from "bun";
import fg from "fast-glob";

export const main = async () => {
  const args = process.argv.slice(3);

  if (args.length === 0) {
    console.error(
      "Usage: bun run compile-single-workflow-to-wasm.ts <workflow-name>"
    );
    console.error(
      "       bun run compile-single-workflow-to-wasm.ts <directory> <workflow-name>"
    );
    console.error("Examples:");
    console.error(
      "  Single: bun run compile-single-workflow-to-wasm.ts capability_calls_are_async"
    );
    console.error(
      "  Nested: bun run compile-single-workflow-to-wasm.ts mode_switch don_runtime_in_node_mode"
    );
    process.exit(1);
  }

  let jsFile: string;
  let buildCommand: string;

  if (args.length === 1) {
    // Single workflow parameter - works as before
    const workflowName = args[0];
    console.info(`🔨 Compiling workflow to WASM: ${workflowName}`);
    jsFile = `dist/workflows/standard_tests/${workflowName}/test.js`;
    buildCommand = `bun run build-single-workflow-js.ts ${workflowName}`;
  } else if (args.length === 2) {
    // Two parameters - first is directory, second is nested workflow
    const directory = args[0];
    const workflowName = args[1];
    console.info(`🔨 Compiling nested workflow to WASM: ${directory}/${workflowName}`);
    jsFile = `dist/workflows/standard_tests/${directory}/${workflowName}/test.js`;
    buildCommand = `bun run build-single-workflow-js.ts ${directory} ${workflowName}`;
  } else {
    console.error("❌ Too many arguments provided");
    process.exit(1);
  }

  const wasmFile = jsFile.replace(/\.js$/, ".wasm");

  // Check if the JS file exists
  const jsFiles = fg.sync(jsFile);
  if (jsFiles.length === 0) {
    console.error(`❌ No JS file found: ${jsFile}`);
    console.error(
      `Make sure to build the workflow first with: ${buildCommand}`
    );
    process.exit(1);
  }

  console.info(`📁 Found: ${jsFile}`);
  console.info(`🎯 Output: ${wasmFile}`);

  /**
   * -C wit=src/workflows/workflow.wit — points to the WIT file (definition of what will be available for the Host).
   * -C wit-world=workflow — specifies the WIT world name (world "workflow" which is defined in the .wit file).
   * -C plugin=... — uses your custom runtime (bundled javy chainlink sdk plugin)
   */
  await $`bun javy build -C wit=src/workflows/workflow.wit -C wit-world=workflow -C plugin=dist/javy-chainlink-sdk.plugin.wasm ${jsFile} -o ${wasmFile}`;

  console.info(`✅ Compiled: ${wasmFile}`);
};
