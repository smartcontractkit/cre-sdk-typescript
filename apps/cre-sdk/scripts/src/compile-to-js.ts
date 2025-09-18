import { $ } from "bun";
import path from "node:path";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";

export const main = async () => {
  const args = process.argv.slice(3);

  if (args.length === 0) {
    console.error("Usage: bun test:standard:compile:js <full-path-to-test.ts>");
    console.error("Example:");
    console.error(
      "  bun test:standard:compile:js src/standard_tests/mode_switch/don_runtime_in_node_mode/test.ts"
    );
    process.exit(1);
  }

  const inputPath = args[0];
  if (!inputPath.endsWith("test.ts")) {
    console.error("❌ Input must point to a 'test.ts' file");
    process.exit(1);
  }

  const resolvedPath = path.resolve(inputPath);
  console.info(`📁 Using test file: ${resolvedPath}`);

  // Derive output path inside .temp/standard_tests preserving relative structure
  const relative = path.relative(
    "src/standard_tests",
    path.dirname(resolvedPath)
  );
  const outputPath = path.join(".temp/standard_tests", relative);

  // Ensure the output directory exists
  await mkdir(outputPath, { recursive: true });

  // First build step
  await Bun.build({
    entrypoints: [resolvedPath],
    outdir: outputPath,
    target: "node",
    format: "esm",
  });

  const targetJsFile = path.join(outputPath, "test.js");

  if (!existsSync(targetJsFile)) {
    console.error(`❌ Expected file not found: ${targetJsFile}`);
    process.exit(1);
  }

  // Bundle into single file
  await $`bun build ${targetJsFile} --bundle --outfile=${targetJsFile}`;

  console.info(`✅ Built: ${targetJsFile}`);
};
