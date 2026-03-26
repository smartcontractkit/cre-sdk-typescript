#!/usr/bin/env bun

import { main as compileWorkflow } from "../scripts/src/compile-workflow";
import { parseCompileFlags } from "../../cre-sdk-javy-plugin/scripts/parse-compile-flags";
import { WorkflowRuntimeCompatibilityError } from "../scripts/src/validate-workflow-runtime-compat";

const main = async () => {
  const cliArgs = process.argv.slice(2);
  const { creExports, plugin, rest } = parseCompileFlags(cliArgs);

  const inputPath = rest[0];
  const outputPathArg = rest[1];

  if (!inputPath) {
    console.error(
      "Usage: cre-compile [--plugin <path>] [--cre-exports <crate-dir>]... <path/to/workflow.ts> [path/to/output.wasm]"
    );
    process.exit(1);
  }

  if (plugin !== null && creExports.length > 0) {
    console.error("❌ Error: --plugin and --cre-exports are mutually exclusive.");
    process.exit(1);
  }

  await compileWorkflow(
    inputPath,
    outputPathArg,
    creExports.length > 0 ? creExports : undefined,
    plugin ?? undefined,
  );
};

main().catch((e) => {
  if (e instanceof WorkflowRuntimeCompatibilityError) {
    console.error(`\n❌ ${e.message}`);
  } else {
    console.error(e);
  }
  process.exit(1);
});
