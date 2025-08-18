import { Buffer } from "node:buffer";

/**
 * This function is used to prepare the runtime for the SDK to work.
 * It should be called as a part of SDK initialization.
 * It exposes NodeJS Buffer in global namespace, so it can be bundled and used in workflow code.
 */
export const prepareRuntime = () => {
  globalThis.Buffer = Buffer as any;
};
