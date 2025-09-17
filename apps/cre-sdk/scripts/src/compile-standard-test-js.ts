import { $ } from "bun";
import fg from "fast-glob";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";

export const main = async () => {
  const args = process.argv.slice(3);

  if (args.length === 0) {
    console.error("Usage: bun test:standard:compile:js <standard-test-name>");
    console.error(
      "       bun test:standard:compile:js <directory> <standard-test-name>"
    );
    console.error("Examples:");
    console.error(
      "  Single: bun test:standard:compile:js capability_calls_are_async"
    );
    console.error(
      "  Nested: bun test:standard:compile:js mode_switch don_runtime_in_node_mode"
    );
    process.exit(1);
  }

  let outputPath: string;
  let pattern: string;

  if (args.length === 1) {
    // Single parameter - standard test name
    const standardTestName = args[0];
    console.info(`Building test: ${standardTestName}`);
    pattern = `src/standard_tests/${standardTestName}/test.ts`;
    outputPath = `.temp/standard_tests/${standardTestName}`;
  } else if (args.length === 2) {
    // Two parameters - first is directory, second is nested standard test name
    const directory = args[0];
    const standardTestName = args[1];
    console.info(`Building nested test: ${directory}/${standardTestName}`);
    pattern = `src/standard_tests/${directory}/${standardTestName}/test.ts`;
    outputPath = `.temp/standard_tests/${directory}/${standardTestName}`;
  } else {
    console.error("❌ Too many arguments provided");
    process.exit(1);
  }

  // Find the specific workflow file
  const standardTestSourcePaths = await fg(pattern);

  if (standardTestSourcePaths.length === 0) {
    console.error(`❌ No test found: ${pattern}`);
    process.exit(1);
  }

  const standardTestPath = standardTestSourcePaths[0];
  console.info(`📁 Found: ${standardTestPath}`);

  // Ensure the output directory exists
  await mkdir(outputPath, { recursive: true });

  // Build the single standard test
  await Bun.build({
    entrypoints: [`./${standardTestPath}`],
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
