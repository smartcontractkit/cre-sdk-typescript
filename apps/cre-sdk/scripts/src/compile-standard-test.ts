import { $ } from "bun";

export const main = async () => {
  const args = process.argv.slice(3);

  if (args.length === 0) {
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

  const testDisplayName = args.length === 1 ? args[0] : `${args[0]}/${args[1]}`;
  console.info(`🚀 Compiling standard test: ${testDisplayName}`);

  // Build JS
  console.info("\n📦 Step 1: Compiling JS...");
  await $`bun test:standard:compile:js ${args}`;

  // Build WASM
  console.info("\n🔨 Step 2: Compiling to WASM...");
  await $`bun test:standard:compile:wasm ${args}`;

  console.info(`\n✅ Test '${testDisplayName}' built successfully!`);
};
