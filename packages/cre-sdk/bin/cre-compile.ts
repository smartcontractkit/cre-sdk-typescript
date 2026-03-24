#!/usr/bin/env bun

import { main as compileWorkflow } from "../scripts/src/compile-workflow";
import { WorkflowRuntimeCompatibilityError } from "../scripts/src/validate-workflow-runtime-compat";

const main = async () => {
  const [inputPath, outputPathArg] = process.argv.slice(2);

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

  await compileWorkflow(inputPath, outputPathArg);
};

// CLI entry point
main().catch((e) => {
  if (e instanceof WorkflowRuntimeCompatibilityError) {
    console.error(`\n❌ ${e.message}`);
  } else {
    console.error(e);
  }
  process.exit(1);
});
