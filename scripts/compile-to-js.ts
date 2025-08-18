import fg from "fast-glob";
import { $ } from "bun";

export const main = async () => {
  console.info("\n\n---> Compile TS source files to JS\n\n");

  const workflowsSourcePaths = await fg("src/workflows/**/*.ts");
  const workflows = Array.from(workflowsSourcePaths).map((path) => `./${path}`);

  await Bun.build({
    entrypoints: [...workflows],
    outdir: "./dist/workflows",
    target: "node",
    format: "esm",
    root: "./src/workflows",
  });

  console.info("\n---> Bundling individual workflow files\n\n");

  // Get all the generated JS files in dist/workflows
  const workflowJSFiles = await fg("dist/workflows/**/*.js");

  for (const jsFile of workflowJSFiles) {
    await $`bun build ${jsFile} --bundle --outfile=${jsFile}`;
  }

  console.info("Bundling: Done!");
};
