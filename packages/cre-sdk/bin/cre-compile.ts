#!/usr/bin/env bun

import { main as compileWorkflow } from "../scripts/src/compile-workflow";
import { parseCompileFlags } from "@chainlink/cre-sdk-javy-plugin/scripts/parse-compile-flags";
import {
  parseCompileCliArgs,
  skipTypeChecksFlag,
} from "../scripts/src/compile-cli-args";
import { WorkflowTypecheckError } from "../scripts/src/typecheck-workflow";
import { WorkflowRuntimeCompatibilityError } from "../scripts/src/validate-workflow-runtime-compat";

const main = async () => {
  const cliArgs = process.argv.slice(2);
  const { creExports, plugin, rest } = parseCompileFlags(cliArgs);

  let inputPath: string | undefined;
  let outputPathArg: string | undefined;
  let skipTypeChecks = false;

  try {
    const parsed = parseCompileCliArgs(rest);
    inputPath = parsed.inputPath;
    outputPathArg = parsed.outputPath;
    skipTypeChecks = parsed.skipTypeChecks;
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    console.error(
      `Usage: cre-compile [--plugin <path>] [--cre-exports <crate-dir>]... <path/to/workflow.ts> [path/to/output.wasm] [${skipTypeChecksFlag}]`,
    );
    process.exit(1);
  }

  if (plugin !== null && creExports.length > 0) {
    console.error("❌ Error: --plugin and --cre-exports are mutually exclusive.");
    process.exit(1);
  }

  if (!inputPath) {
    console.error(
      `Usage: cre-compile [--plugin <path>] [--cre-exports <crate-dir>]... <path/to/workflow.ts> [path/to/output.wasm] [${skipTypeChecksFlag}]`,
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

  await compileWorkflow(inputPath, outputPathArg, {
    skipTypeChecks,
    creExports: creExports.length > 0 ? creExports : undefined,
    plugin,
  });
};

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
