import fg from "fast-glob";
import { $ } from "bun";
import { mkdir } from "fs/promises";
import { existsSync } from "fs";

export const main = async () => {
  const args = process.argv.slice(3);

  if (args.length === 0) {
    console.error("Usage: bun run build-single-workflow-js.ts <workflow-name>");
    console.error("       bun run build-single-workflow-js.ts <directory> <workflow-name>");
    console.error("Examples:");
    console.error("  Single: bun run build-single-workflow-js.ts capability_calls_are_async");
    console.error("  Nested: bun run build-single-workflow-js.ts mode_switch don_runtime_in_node_mode");
    process.exit(1);
  }

  let workflowPath: string;
  let outputPath: string;
  let pattern: string;

  if (args.length === 1) {
    // Single workflow parameter - works as before
    const workflowName = args[0];
    console.info(`Building workflow: ${workflowName}`);
    pattern = `src/workflows/standard_tests/${workflowName}/test.ts`;
    outputPath = `dist/workflows/standard_tests/${workflowName}`;
  } else if (args.length === 2) {
    // Two parameters - first is directory, second is nested workflow
    const directory = args[0];
    const workflowName = args[1];
    console.info(`Building nested workflow: ${directory}/${workflowName}`);
    pattern = `src/workflows/standard_tests/${directory}/${workflowName}/test.ts`;
    outputPath = `dist/workflows/standard_tests/${directory}/${workflowName}`;
  } else {
    console.error("❌ Too many arguments provided");
    process.exit(1);
  }

  // Find the specific workflow file
  const workflowsSourcePaths = await fg(pattern);

  if (workflowsSourcePaths.length === 0) {
    console.error(`❌ No workflow found: ${pattern}`);
    process.exit(1);
  }

  workflowPath = workflowsSourcePaths[0];
  console.info(`📁 Found: ${workflowPath}`);

  // Ensure the output directory exists
  await mkdir(outputPath, { recursive: true });

  // Build the single workflow
  await Bun.build({
    entrypoints: [`./${workflowPath}`],
    outdir: outputPath,
    target: "node",
    format: "esm",
  });

  const targetJsFile = `${outputPath}/test.js`;

  if (!existsSync(targetJsFile)) {
    console.error(`❌ Expected file not found: ${targetJsFile}`);
    process.exit(1);
  }

  await $`bun build ${targetJsFile} --bundle --outfile=${targetJsFile}`;

  console.info(`✅ Built: ${targetJsFile}`);
};
