#!/usr/bin/env bun
import { $ } from "bun";
import { resolve, dirname, extname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

const [, , inputFile, outputFile] = process.argv;

if (!inputFile || !outputFile) {
  console.error("Usage: cre-compile <input.ts> <output.wasm>");
  console.error("Example: cre-compile hello-world.ts hello-world.wasm");
  process.exit(1);
}

const main = async () => {
  try {
    // Check if input file exists
    if (!existsSync(inputFile)) {
      console.error(`❌ Input file not found: ${inputFile}`);
      process.exit(1);
    }

    const inputExt = extname(inputFile);

    // Ensure input is TypeScript
    if (inputExt !== ".ts") {
      console.error(
        `❌ Only TypeScript files (.ts) are supported. Got: ${inputExt}`
      );
      process.exit(1);
    }

    console.info("🚀 Compiling TypeScript workflow to WebAssembly...");

    // Create temp directory for intermediate files
    const tempDir = resolve(tmpdir(), `cre-compile-${randomUUID()}`);
    mkdirSync(tempDir, { recursive: true });

    const inputBaseName = basename(inputFile, ".ts");
    const tempJsFile = resolve(tempDir, `${inputBaseName}.js`);

    console.info("📦 Step 1: Compiling TypeScript to JavaScript...");

    // First step: Compile TypeScript to JavaScript (no bundling yet)
    const result = await Bun.build({
      entrypoints: [resolve(inputFile)],
      outdir: tempDir,
      target: "node",
      format: "esm",
    });

    if (!result.success) {
      console.error("❌ TypeScript compilation failed:");
      for (const log of result.logs) {
        console.error(log.message);
      }
      process.exit(1);
    }

    // Check if the JS file was created
    if (!existsSync(tempJsFile)) {
      console.error(`❌ Expected file not found: ${tempJsFile}`);
      process.exit(1);
    }

    // Second step: Bundle the JavaScript file
    await $`bun build ${tempJsFile} --bundle --outfile=${tempJsFile}`;

    console.info("✅ TypeScript compiled successfully");
    console.info("🔨 Step 2: Compiling JavaScript to WebAssembly...");

    // Try to use the javy plugin from workspace or installed package
    console.info("🔧 Setting up javy plugin (one-time setup)...");

    // First try workspace commands (development environment)
    let setupSuccess = false;
    try {
      await $`bun cre-setup`.quiet();
      setupSuccess = true;
    } catch (workspaceError) {
      // Try npx for published packages
      try {
        await $`npx @chainlink/cre-sdk-javy-plugin cre-setup`.quiet();
        setupSuccess = true;
      } catch (npxError) {
        console.warn(
          "⚠️  Could not run cre-setup automatically. Continuing..."
        );
      }
    }

    console.info("🔨 Compiling JavaScript to WebAssembly...");

    // Try workspace command first, then fall back to published package
    try {
      await $`bun cre-compile-workflow ${tempJsFile} ${outputFile}`;
    } catch (workspaceError) {
      try {
        await $`npx @chainlink/cre-sdk-javy-plugin cre-compile-workflow ${tempJsFile} ${outputFile}`;
      } catch (npxError) {
        // Last resort: try to find the plugin files directly
        const executableDir = dirname(process.argv[0]);
        const possibleJavyPaths = [
          // Look in the same directory structure as our development environment
          resolve(
            executableDir,
            "../cre-sdk-javy-plugin/bin/compile-workflow.js"
          ),
          resolve(
            executableDir,
            "../../cre-sdk-javy-plugin/bin/compile-workflow.js"
          ),
          // Look in node_modules from the package installation
          resolve(
            executableDir,
            "../node_modules/@chainlink/cre-sdk-javy-plugin/bin/compile-workflow.js"
          ),
          // Look from current working directory
          resolve(
            process.cwd(),
            "node_modules/@chainlink/cre-sdk-javy-plugin/bin/compile-workflow.js"
          ),
        ];

        let javyPluginPath = null;
        for (const path of possibleJavyPaths) {
          if (existsSync(path)) {
            javyPluginPath = path;
            break;
          }
        }

        if (!javyPluginPath) {
          console.error(
            "❌ Could not find javy plugin. Make sure @chainlink/cre-sdk-javy-plugin is available."
          );
          console.error(
            "💡 Try running: npm install @chainlink/cre-sdk-javy-plugin"
          );
          process.exit(1);
        }

        // Use the plugin directly
        await $`node ${javyPluginPath} ${tempJsFile} ${outputFile}`;
      }
    }

    console.info(`✅ Successfully compiled to: ${outputFile}`);

    // Clean up temp directory
    await $`rm -rf ${tempDir}`;
  } catch (error) {
    console.error(`❌ Compilation failed: ${error.message}`);
    process.exit(1);
  }
};

main();
