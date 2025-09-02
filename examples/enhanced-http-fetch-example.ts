/**
 * Example demonstrating enhanced HTTP fetch with mode safety
 *
 * This example shows how the enhanced HTTP fetch utilities enforce
 * proper mode usage to prevent non-deterministic behavior in consensus.
 */

import { enhancedCre, Mode } from "@cre/sdk/enhanced";
import { creFetch } from "@cre/sdk/utils/capabilities/http/fetch";

export const demonstrateHttpFetchModeSafety = async () => {
  console.log("=== Enhanced HTTP Fetch Mode Safety Demo ===\n");

  // 1. Show that legacy creFetch works in DON mode (potentially unsafe)
  console.log("1. Legacy creFetch in DON mode (potentially unsafe):");
  try {
    console.log(`Current mode: ${Mode[enhancedCre.getCurrentMode()]}`);
    const response = await creFetch({ url: "https://httpbin.org/get" });
    console.log(`✓ Legacy fetch succeeded: ${response.statusCode}`);
    console.log(
      "⚠️  WARNING: This could lead to non-deterministic consensus behavior!"
    );
  } catch (error) {
    console.log(`Legacy fetch failed: ${(error as Error).message}`);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // 2. Show that enhanced fetch blocks DON mode by default
  console.log("2. Enhanced fetch in DON mode (blocked by default):");
  try {
    console.log(`Current mode: ${Mode[enhancedCre.getCurrentMode()]}`);
    await enhancedCre.enhancedGet("https://httpbin.org/get");
    console.log("❌ ERROR: Enhanced fetch should have been blocked!");
  } catch (error) {
    console.log(
      `✓ Enhanced fetch correctly blocked: ${(error as Error).message}`
    );
    console.log("✓ This prevents non-deterministic consensus behavior!");
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // 3. Show proper usage in NODE mode
  console.log("3. Enhanced fetch in NODE mode (proper usage):");
  await enhancedCre.runInNodeMode(async () => {
    try {
      console.log(`Current mode: ${Mode[enhancedCre.getCurrentMode()]}`);
      const response = await enhancedCre.enhancedGet("https://httpbin.org/get");
      console.log(
        `✓ Enhanced fetch succeeded in NODE mode: ${response.status}`
      );
      console.log("✓ This ensures deterministic consensus behavior!");

      return {
        observation: { httpStatus: response.status },
        descriptors: {},
        default: {},
      };
    } catch (error) {
      console.log(
        `Enhanced fetch failed (network issue): ${(error as Error).message}`
      );
      return { observation: { httpStatus: 0 }, descriptors: {}, default: {} };
    }
  });

  console.log("\n" + "=".repeat(50) + "\n");

  // 4. Show unsafe override (use with extreme caution)
  console.log("4. Unsafe enhanced fetch (bypasses safety checks):");
  try {
    console.log(`Current mode: ${Mode[enhancedCre.getCurrentMode()]}`);
    const { unsafeEnhancedFetch } = await import(
      "@cre/sdk/utils/capabilities/http/enhanced-fetch"
    );
    const response = await unsafeEnhancedFetch({
      url: "https://httpbin.org/get",
      enforceNodeMode: false,
    });
    console.log(`⚠️  Unsafe fetch succeeded: ${response.status}`);
    console.log(
      "⚠️  WARNING: Use unsafe fetch only when absolutely necessary!"
    );
  } catch (error) {
    console.log(
      `Unsafe fetch failed (network issue): ${(error as Error).message}`
    );
  }

  console.log("\n=== Demo Complete ===");
};

// Example workflow using enhanced HTTP fetch safely
export const createSafeHttpWorkflow = () => {
  return [
    enhancedCre.safeHandler(
      // Trigger would go here
      null,
      async (config: any, runtime, triggerOutput) => {
        console.log("Executing safe HTTP workflow...");

        // This will work - HTTP operations in NODE mode
        const result = await runtime.runInNodeMode(async (nodeRuntime) => {
          const response = await enhancedCre.enhancedGet(
            "https://httpbin.org/ip"
          );

          return {
            observation: {
              ip: JSON.parse(response.body).origin,
              status: response.status,
            },
            descriptors: {},
            default: {},
          };
        });

        return result;
      }
    ),
  ];
};

// Run the demo if this file is executed directly
if (require.main === module) {
  demonstrateHttpFetchModeSafety().catch(console.error);
}
