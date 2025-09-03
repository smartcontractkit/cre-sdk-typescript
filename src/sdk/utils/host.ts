import { Mode } from "@cre/generated/sdk/v1alpha/sdk_pb";
import { z } from "zod";

// Zod schema for validating global host functions
const GlobalHostFunctionsSchema = z.object({
  switchModes: z.function().args(z.nativeEnum(Mode)).returns(z.void()),
  log: z.function().args(z.string()).returns(z.void()),
  sendResponse: z.function().args(z.string()).returns(z.number()),
  randomSeed: z
    .function()
    .args(z.union([z.literal(Mode.DON), z.literal(Mode.NODE)]))
    .returns(z.number()),
  versionV2: z.function().args().returns(z.void()),
  callCapability: z.function().args(z.string()).returns(z.number()),
  awaitCapabilities: z
    .function()
    .args(z.string(), z.number())
    .returns(z.string()),
  getSecrets: z.function().args(z.string(), z.number()).returns(z.number()),
  awaitSecrets: z.function().args(z.string(), z.number()).returns(z.string()),
  getWasiArgs: z.function().args().returns(z.string()),
});

type GlobalHostFunctionsMap = z.infer<typeof GlobalHostFunctionsSchema>;

// Validate global host functions at runtime
const validateGlobalHostFunctions = (): GlobalHostFunctionsMap => {
  const globalFunctions =
    globalThis as unknown as Partial<GlobalHostFunctionsMap>;

  try {
    return GlobalHostFunctionsSchema.parse(globalFunctions);
  } catch (error) {
    const missingFunctions = Object.keys(
      GlobalHostFunctionsSchema.shape
    ).filter((key) => !(key in globalFunctions));

    throw new Error(
      `Missing required global host functions: ${missingFunctions.join(
        ", "
      )}. ` +
        `This indicates the runtime environment is not properly configured.`
    );
  }
};

// Initialize validated global functions
const g = validateGlobalHostFunctions();

export const host = {
  switchModes: (mode: Mode): void => {
    g.switchModes(mode);
    runtimeGuards.setMode(mode);
  },
  log: (message: string): void => g.log(String(message)),
  sendResponse: (payloadBase64: string): number =>
    g.sendResponse(payloadBase64),
  randomSeed: (mode: Mode.DON | Mode.NODE = Mode.DON): number =>
    g.randomSeed(mode),
  versionV2: (): void => g.versionV2(),
  callCapability: (request: string): number => g.callCapability(request),
  awaitCapabilities: (awaitRequest: string, maxResponseLen: number): string =>
    g.awaitCapabilities(awaitRequest, maxResponseLen),
  getSecrets: (request: string, maxResponseLen: number): number =>
    g.getSecrets(request, maxResponseLen),
  awaitSecrets: (awaitRequest: string, maxResponseLen: number): string =>
    g.awaitSecrets(awaitRequest, maxResponseLen),
  getWasiArgs: (): string => g.getWasiArgs(),
};

// Simple runtime guard state
export const runtimeGuards = (() => {
  let currentMode: Mode = Mode.DON;
  let donModeGuardError: Error | null = null;
  let nodeModeGuardError: Error | null = null;

  const setMode = (mode: Mode) => {
    currentMode = mode;
    if (mode === Mode.NODE) {
      // In node mode, forbid DON runtime calls
      donModeGuardError = new Error("cannot use Runtime inside RunInNodeMode");
      nodeModeGuardError = null;
    } else if (mode === Mode.DON) {
      // Back in DON mode, forbid node runtime calls
      nodeModeGuardError = new Error(
        "cannot use NodeRuntime outside RunInNodeMode"
      );
      donModeGuardError = null;
    } else {
      donModeGuardError = null;
      nodeModeGuardError = null;
    }
  };

  const assertDonSafe = () => {
    if (donModeGuardError) {
      throw donModeGuardError;
    }
  };

  const assertNodeSafe = () => {
    if (nodeModeGuardError) {
      throw nodeModeGuardError;
    }
  };

  const getMode = () => currentMode;

  return { setMode, assertDonSafe, assertNodeSafe, getMode };
})();
