import { $ } from "bun";
import fg from "fast-glob";
import path from "node:path";

export const main = async () => {
  console.info("🚀 Compiling all standard tests...\n");

  // Find all test.ts files in standard_tests
  const testFiles = await fg("src/standard_tests/**/test.ts");

  if (testFiles.length === 0) {
    console.error("❌ No standard test files found");
    process.exit(1);
  }

  const testTargets: Array<{ name: string; args: string[] }> = [];

  // Parse test files to determine compilation targets
  for (const testFile of testFiles) {
    const relativePath = testFile
      .replace("src/standard_tests/", "")
      .replace("/test.ts", "");
    const pathParts = relativePath.split("/");

    if (pathParts.length === 1) {
      // Single level test (e.g., "secrets")
      testTargets.push({
        name: pathParts[0],
        args: [pathParts[0]],
      });
    } else if (pathParts.length === 2) {
      // Nested test (e.g., "mode_switch/successful_mode_switch")
      testTargets.push({
        name: `${pathParts[0]}/${pathParts[1]}`,
        args: [pathParts[0], pathParts[1]],
      });
    } else {
      console.warn(`⚠️  Skipping deeply nested test: ${relativePath}`);
    }
  }

  console.info(`📋 Found ${testTargets.length} tests to compile:`);
  for (const target of testTargets) {
    console.info(`   • ${target.name}`);
  }
  console.info("");

  let successCount = 0;
  let failureCount = 0;
  const failures: string[] = [];

  // Compile each test
  for (const target of testTargets) {
    try {
      console.info(`🔨 Compiling: ${target.name}`);
      await $`bun test:standard:compile ${target.args}`;
      successCount++;
      console.info(`✅ Success: ${target.name}\n`);
    } catch (error) {
      failureCount++;
      failures.push(target.name);
      console.error(`❌ Failed: ${target.name}`);
      console.error(`   Error: ${error}\n`);
    }
  }

  // Summary
  console.info("📊 Compilation Summary:");
  console.info(`   ✅ Successful: ${successCount}`);
  console.info(`   ❌ Failed: ${failureCount}`);

  if (failures.length > 0) {
    console.info(`   Failed tests: ${failures.join(", ")}`);
    process.exit(1);
  }

  console.info(
    `\n🎉 All ${successCount} standard tests compiled successfully!`
  );
};
