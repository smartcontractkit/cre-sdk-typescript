import { main as compileToJS } from "./scripts/compile-to-js";
import { main as compileToWasm } from "./scripts/compile-to-wasm";
import { main as compileJavySdkPlugin } from "./scripts/compile-javy-sdk-plugin";
import { main as compileJavyWithSdkPlugin } from "./scripts/compile-javy-with-sdk-plugin";

await compileJavySdkPlugin();
await compileJavyWithSdkPlugin();
await compileToJS();
await compileToWasm();
