#!/usr/bin/env bun

import { main as compileWorkflow } from "../scripts/src/compile-workflow";
import { parseCompileFlags } from "../../cre-sdk-javy-plugin/scripts/parse-compile-flags";

const main = async () => {
  const cliArgs = process.argv.slice(2);
  const { creExports, plugin, rest } = parseCompileFlags(cliArgs);

  const inputPath = rest[0];
  const outputPathArg = rest[1];

  if (!inputPath) {
    console.error(
      "Usage: cre-compile [--plugin <path>] [--cre-exports <path>]... <path/to/workflow.ts> [path/to/output.wasm]"
    );
    console.error("Examples:");
    console.error("  cre-compile src/standard_tests/secrets/test.ts");
    console.error(
      "  cre-compile --plugin ./plugin.plugin.wasm rust-inject/workflow/index.ts rust-inject/workflow/wasm/workflow.wasm"
    );
    console.error(
      "  cre-compile --cre-exports ./lib_beta rust-inject/workflow/index.ts rust-inject/workflow/wasm/workflow.wasm"
    );
    process.exit(1);
  }

  if (plugin !== null && creExports.length > 0) {
    console.error("❌ Error: --plugin and --cre-exports are mutually exclusive. Use one or the other.");
    process.exit(1);
  }

  await compileWorkflow(
    inputPath,
    outputPathArg,
    creExports.length > 0 ? creExports : undefined,
    plugin ?? undefined,
  );
};

// CLI entry point
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
