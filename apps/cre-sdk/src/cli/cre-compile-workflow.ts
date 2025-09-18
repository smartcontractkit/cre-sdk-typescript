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

    console.info("📦 Step 1: Compiling TypeScript to JavaScript...");

    // Use Bun's built-in TypeScript compilation with bundling directly from the original file
    const result = await Bun.build({
      entrypoints: [resolve(inputFile)],
      outdir: tempDir,
      target: "node",
      format: "esm",
      minify: false,
    });

    if (!result.success) {
      console.error("❌ TypeScript compilation failed:");
      for (const log of result.logs) {
        console.error(log.message);
      }
      process.exit(1);
    }

    // Get the generated output file path
    const tempJsFile = result.outputs[0]?.path;
    if (!tempJsFile) {
      console.error("❌ No output file generated");
      process.exit(1);
    }

    console.info("✅ TypeScript compiled successfully");
    console.info("🔨 Step 2: Compiling JavaScript to WebAssembly...");

    // Find the javy plugin locally first (workspace setup)
    const executableDir = dirname(process.argv[0]);
    const possibleJavyPaths = [
      // Look in the same directory structure as our development environment
      resolve(executableDir, "../cre-sdk-javy-plugin/bin/compile-workflow.js"),
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

    // If we found the plugin locally, use it directly
    if (javyPluginPath) {
      console.info("🔧 Setting up javy plugin (one-time setup)...");

      // Find the setup script
      const setupScript = javyPluginPath.replace(
        "compile-workflow.js",
        "setup.js"
      );
      if (existsSync(setupScript)) {
        try {
          await $`node ${setupScript}`.quiet();
        } catch (setupError) {
          console.warn(
            "⚠️  Could not run cre-setup automatically. Continuing..."
          );
        }
      }

      console.info("🔨 Compiling JavaScript to WebAssembly...");
      await $`node ${javyPluginPath} ${tempJsFile} ${outputFile}`;
    } else {
      // Try published package approach
      console.info("🔧 Setting up javy plugin (one-time setup)...");

      try {
        // Try to run cre-setup to ensure javy plugin is compiled
        await $`npx @chainlink/cre-sdk-javy-plugin cre-setup`.quiet();
      } catch (setupError) {
        // If npx fails, try bunx
        try {
          await $`bunx @chainlink/cre-sdk-javy-plugin cre-setup`.quiet();
        } catch (bunxError) {
          console.warn(
            "⚠️  Could not run cre-setup automatically. Continuing..."
          );
        }
      }

      console.info("🔨 Compiling JavaScript to WebAssembly...");

      try {
        // First try with npx
        await $`npx @chainlink/cre-sdk-javy-plugin cre-compile-workflow ${tempJsFile} ${outputFile}`;
      } catch (npxError) {
        try {
          // Fallback to bunx
          await $`bunx @chainlink/cre-sdk-javy-plugin cre-compile-workflow ${tempJsFile} ${outputFile}`;
        } catch (bunxError) {
          console.error(
            "❌ Could not find javy plugin. Make sure @chainlink/cre-sdk-javy-plugin is available."
          );
          console.error(
            "💡 Try running: npm install @chainlink/cre-sdk-javy-plugin"
          );
          process.exit(1);
        }
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
