import { $ } from "bun";

export const main = async () => {
  const standardTestArg = process.argv[3];

  if (!standardTestArg) {
    console.error("Usage: bun test:standard:compile <standard-test-name>");
    console.error("Example: bun test:standard:compile secrets");
    console.error(
      "Nested test usage: bun test:standard:compile <directory> <standard-test-name>"
    );
    console.error(
      "Nested test example: bun test:standard:compile mode_switch successful_mode_switch"
    );
    process.exit(1);
  }

  console.info(`🚀 Compiling standard test: ${standardTestArg}`);

  // Build JS
  console.info("\n📦 Step 1: Compiling JS...");
  await $`bun test:standard:compile:js ${standardTestArg}`;

  // Build WASM
  console.info("\n🔨 Step 2: Compiling to WASM...");
  await $`bun test:standard:compile:wasm ${standardTestArg}`;

  console.info(`\n✅ Test '${standardTestArg}' built successfully!`);
};
