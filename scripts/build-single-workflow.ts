import { $ } from "bun";

export const main = async () => {
  const workflowArg = process.argv[3];

  if (!workflowArg) {
    console.error("Usage: bun run build-single-workflow.ts <workflow-name>");
    console.error("Example: bun run build-single-workflow.ts secrets");
    process.exit(1);
  }

  console.info(`🚀 Building workflow: ${workflowArg}`);

  // Build JS
  console.info("\n📦 Step 1: Building JS...");
  await $`bun scripts/run.ts build-single-workflow-js ${workflowArg}`;

  // Build WASM
  console.info("\n🔨 Step 2: Compiling to WASM...");
  await $`bun scripts/run.ts compile-single-workflow-to-wasm ${workflowArg}`;

  console.info(`\n✅ Workflow '${workflowArg}' built successfully!`);
};
