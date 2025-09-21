#!/usr/bin/env bun
import { ensureJavy } from "../src/ensure-javy.js";
import { spawn } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const javyPath = await ensureJavy({ version: "v5.0.4" });

// Compile javy with the Chainlink SDK plugin
const pluginWasmPath = resolve(__dirname, "../dist/javy_chainlink_sdk.wasm");
const pluginOutputPath = resolve(
  __dirname,
  "../dist/javy-chainlink-sdk.plugin.wasm"
);

await new Promise((resolve, reject) => {
  const initPlugin = spawn(
    javyPath,
    ["init-plugin", pluginWasmPath, "-o", pluginOutputPath],
    { stdio: "inherit" }
  );

  initPlugin.on("exit", (code) => {
    if (code === 0) {
      resolve();
      return;
    }

    reject(
      new Error(`❌ Failed to set up the CRE TS SDK. Error code: ${code}`)
    );
  });
});

console.log("✅ CRE TS SDK is ready to use.");
