#!/usr/bin/env bun

const availableScripts = [
  "compile-to-js",
  "compile-to-wasm",
  "compile-standard-test", // bundles JS and WASM compilation into single script
  "compile-standard-test-js",
  "compile-standard-test-wasm",
  "compile-all-standard-tests",

  "generate-chain-selectors",
  "generate-sdks",
];

/**
 * Main entry point for scripts related to the development of the SDK.
 */
const main = async () => {
  const scriptName = process.argv[2];

  if (!scriptName) {
    console.error("Usage: bun run.ts <script-name>");
    console.error("Available scripts:");
    availableScripts.forEach((script) => {
      console.error(`  ${script}`);
    });
    process.exit(1);
  }

  try {
    const scriptPath = `./src/${scriptName}.ts`;
    const script = await import(scriptPath);

    if (typeof script.main === "function") {
      await script.main();
    } else {
      console.error(`Script ${scriptName} does not export a main function`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`Failed to load script ${scriptName}:`, error);
    process.exit(1);
  }
};

main();
