import { Mode } from "@cre/generated/sdk/v1alpha/sdk_pb";
import { z } from "zod";

// Zod schema for validating global host functions
const globalHostBindingsSchema = z.object({
  switchModes: z.function().args(z.nativeEnum(Mode)).returns(z.void()),
  log: z.function().args(z.string()).returns(z.void()),
  sendResponse: z.function().args(z.instanceof(Uint8Array)).returns(z.number()),
  randomSeed: z
    .function()
    .args(z.union([z.literal(Mode.DON), z.literal(Mode.NODE)]))
    .returns(z.number()),
  versionV2: z.function().args().returns(z.void()),
  callCapability: z
    .function()
    .args(z.instanceof(Uint8Array))
    .returns(z.number()),
  awaitCapabilities: z
    .function()
    .args(z.instanceof(Uint8Array), z.number())
    .returns(z.instanceof(Uint8Array)),
  getSecrets: z
    .function()
    .args(z.instanceof(Uint8Array), z.number())
    .returns(z.number()),
  awaitSecrets: z
    .function()
    .args(z.instanceof(Uint8Array), z.number())
    .returns(z.instanceof(Uint8Array)),
  getWasiArgs: z.function().args().returns(z.string()),
});

type GlobalHostBindingsMap = z.infer<typeof globalHostBindingsSchema>;

// Validate global host functions at runtime
const validateGlobalHostBindings = (): GlobalHostBindingsMap => {
  const globalFunctions =
    globalThis as unknown as Partial<GlobalHostBindingsMap>;

  try {
    return globalHostBindingsSchema.parse(globalFunctions);
  } catch (error) {
    const missingFunctions = Object.keys(globalHostBindingsSchema.shape).filter(
      (key) => !(key in globalFunctions)
    );

    throw new Error(
      `Missing required global host functions: ${missingFunctions.join(
        ", "
      )}. ` +
        `This indicates the runtime environment is not properly configured.`
    );
  }
};

// Initialize validated global functions
export const hostBindings = validateGlobalHostBindings();
