import { $ } from "bun";
import path from "node:path";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";

const isJsFile = (p: string) =>
  [".js", ".mjs", ".cjs"].includes(path.extname(p).toLowerCase());

export const main = async () => {
  const args = process.argv.slice(3);

  if (args.length === 0) {
    console.error(
      "Usage: bun compile:js-to-wasm <path/to/input.(js|mjs|cjs)> [path/to/output.wasm]"
    );
    console.error("Examples:");
    console.error("  bun compile:js-to-wasm ./build/workflows/test.js");
    console.error(
      "  bun compile:js-to-wasm ./build/workflows/test.mjs ./artifacts/test.wasm"
    );
    process.exit(1);
  }

  const inputPath = args[0];
  const resolvedInput = path.resolve(inputPath);

  if (!isJsFile(resolvedInput)) {
    console.error("❌ Input must be a JavaScript file (.js, .mjs, or .cjs)");
    process.exit(1);
  }
  if (!existsSync(resolvedInput)) {
    console.error(`❌ File not found: ${resolvedInput}`);
    process.exit(1);
  }

  // Default output: same directory, same basename, .wasm extension
  const defaultOut = path.join(
    path.dirname(resolvedInput),
    path.basename(resolvedInput).replace(/\.(m|c)?js$/i, ".wasm")
  );
  const outputPath = args[1] ? path.resolve(args[1]) : defaultOut;

  // Ensure output directory exists
  await mkdir(path.dirname(outputPath), { recursive: true });

  console.info(`🔨 Compiling to WASM`);
  console.info(`📁 Input:  ${resolvedInput}`);
  console.info(`🎯 Output: ${outputPath}`);

  // Uses your CRE wrapper to compile to WASM
  await $`bun cre-compile-workflow ${resolvedInput} ${outputPath}`;

  console.info(`✅ Compiled: ${outputPath}`);
};
