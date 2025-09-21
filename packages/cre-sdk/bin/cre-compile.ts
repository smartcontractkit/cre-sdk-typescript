#!/usr/bin/env bun

import { main as compileWorkflow } from "../scripts/src/compile-workflow";

const main = async () => {
  const cliArgs = process.argv.slice(2);

  const inputPath = cliArgs[0];
  const outputPathArg = cliArgs[1];

  if (!inputPath) {
    console.error(
      "Usage: cre-compile <path/to/workflow.ts> [path/to/output.wasm]"
    );
    console.error("Examples:");
    console.error("  cre-compile src/standard_tests/secrets/test.ts");
    console.error(
      "  cre-compile src/standard_tests/secrets/test.ts .temp/standard_tests/secrets/test.wasm"
    );
    process.exit(1);
  }

  // Delegate to the compile-workflow script
  await compileWorkflow(inputPath, outputPathArg);
};

// CLI entry point
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
