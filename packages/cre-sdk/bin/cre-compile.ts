#!/usr/bin/env bun

import { main as compileWorkflow } from "../scripts/src/compile-workflow";
import {
  parseCompileCliArgs,
  skipTypeChecksFlag,
} from "../scripts/src/compile-cli-args";
import { WorkflowTypecheckError } from "../scripts/src/typecheck-workflow";
import { WorkflowRuntimeCompatibilityError } from "../scripts/src/validate-workflow-runtime-compat";

const main = async () => {
  let inputPath: string | undefined;
  let outputPathArg: string | undefined;
  let skipTypeChecks = false;

  try {
    const parsed = parseCompileCliArgs(process.argv.slice(2));
    inputPath = parsed.inputPath;
    outputPathArg = parsed.outputPath;
    skipTypeChecks = parsed.skipTypeChecks;
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    console.error(
      `Usage: cre-compile <path/to/workflow.ts> [path/to/output.wasm] [${skipTypeChecksFlag}]`,
    );
    process.exit(1);
  }

  if (!inputPath) {
    console.error(
      `Usage: cre-compile <path/to/workflow.ts> [path/to/output.wasm] [${skipTypeChecksFlag}]`,
    );
    console.error("Examples:");
    console.error("  cre-compile src/standard_tests/secrets/test.ts");
    console.error(
      "  cre-compile src/standard_tests/secrets/test.ts .temp/standard_tests/secrets/test.wasm",
    );
    console.error(
      `  cre-compile src/standard_tests/secrets/test.ts .temp/standard_tests/secrets/test.wasm ${skipTypeChecksFlag}`,
    );
    process.exit(1);
  }

  await compileWorkflow(inputPath, outputPathArg, { skipTypeChecks });
};

// CLI entry point
main().catch((e) => {
  if (
    e instanceof WorkflowRuntimeCompatibilityError ||
    e instanceof WorkflowTypecheckError
  ) {
    console.error(`\n❌ ${e.message}`);
  } else {
    console.error(e);
  }
  process.exit(1);
});
