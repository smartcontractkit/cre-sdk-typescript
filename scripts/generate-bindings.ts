import fg from "fast-glob";
import { $ } from "bun";
import { mkdir } from "fs/promises";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { AbiFunction, AbiItem, encodeAbiParameters, parseAbi } from "viem";
import { Abi } from "abitype/zod";
import { formatAbi } from "abitype";
import { generateClass, generateImports } from "./generate-bindings-templates";

function viewFunctionToBinding(item: AbiFunction) {
  const functionName = item.name;
  const inputs =
    item.inputs.length > 0
      ? item.inputs
          .map((input) => {
            return `{
            ${input.name}: ${input.name},
        }`;
          })
          .join(",\n")
      : "";

  const outputs = item.outputs.length > 0 ? item.outputs.join(",") : "";

  const humanReadableAbi = formatAbi([item]);

  return `

${functionName}(${inputs}) {

  const humanReadableAbi = "${humanReadableAbi}" as const;
  
  const ecodedParameters = encodeAbiParameters([parseAbiItem(humanReadableAbi)], ${inputs});

  const dryRunCall = await this.evmClient.callContract({
    call: {
      from: "0x0000000000000000000000000000000000000000", // zero address for view calls
      to: this.contractAddress,
      data: ecodedParameters,
    },
    blockNumber: {
      absVal: "03", // 3 for finalized block
      sign: "-1", // negative
    },
  });

  const decodedParameters = decodeAbiParameters([parseAbiItem(humanReadableAbi)], dryRunCall);

}
    `;
}

export const main = async () => {
  const args = process.argv.slice(3);

  if (args.length === 0) {
    console.error("Usage: bun run build-single-workflow-js.ts <workflow-name>");
    console.error(
      "       bun run build-single-workflow-js.ts <directory> <workflow-name>"
    );
    console.error("Examples:");
    console.error(
      "  Single: bun run build-single-workflow-js.ts capability_calls_are_async"
    );
    console.error(
      "  Nested: bun run build-single-workflow-js.ts mode_switch don_runtime_in_node_mode"
    );
    process.exit(1);
  }

  if (args.length !== 1) {
    throw new Error("Usage: bun run generate-bindings.ts <path-to-abi-json>");
  }
  const abiJsonPath = args[0];
  console.info(`Building workflow: ${abiJsonPath}`);

  const jsonFilePath = join(process.cwd(), abiJsonPath);

  const jsonContent = readFileSync(jsonFilePath, "utf-8");

  const parsedAbi = Abi.parse(JSON.parse(jsonContent));

  console.log(parsedAbi);

  let output = "";

  for (const item of parsedAbi) {
    switch (item.type) {
      case "function": {
        if (item.stateMutability === "view") {
          output += viewFunctionToBinding(item);
          output += "\n";
          break;
        }
        console.log(item.name);
        break;
      }
      case "event": {
        console.log(item.name);
        break;
      }
    }
  }

  output = `${generateImports()}\n\n${generateClass("Workflow", output)}`;

  writeFileSync(join(process.cwd(), "bindings.ts"), output);
};
