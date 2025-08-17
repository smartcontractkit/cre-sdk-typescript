import { Mode } from "@cre/generated/sdk/v1alpha/sdk_pb";

// TODO: zod validation can be setup before running the workflows
// Making sure the hosts functions are exposed and this code will be removed
type GlobalHostFunctionsMap = {
  switchModes: (mode: Mode) => void;
  log: (message: string) => void;
  sendResponse: (response: string) => number;
  randomSeed: (mode: Mode.DON | Mode.NODE) => number;
  versionV2: () => void;
  callCapability: (request: string) => number;
  awaitCapabilities: (awaitRequest: string, maxResponseLen: number) => string;
  getSecrets: (request: string, maxResponseLen: number) => number;
  awaitSecrets: (awaitRequest: string, maxResponseLen: number) => string;
  getWasiArgs: () => string;
};

const g = globalThis as unknown as Partial<GlobalHostFunctionsMap>;

export const host = {
  switchModes: (mode: Mode): void => {
    g.switchModes?.(mode);
    runtimeGuards.setMode(mode);
  },
  log: (message: string): void => g.log?.(String(message)),
  sendResponse: (payloadBase64: string): number =>
    g.sendResponse ? g.sendResponse(payloadBase64) : -1,
  randomSeed: (mode: Mode.DON | Mode.NODE = Mode.DON): number =>
    g.randomSeed ? g.randomSeed(mode) : 0,
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
    if (donModeGuardError) throw donModeGuardError;
  };

  const assertNodeSafe = () => {
    if (nodeModeGuardError) throw nodeModeGuardError;
  };

  const getMode = () => currentMode;

  return { setMode, assertDonSafe, assertNodeSafe, getMode };
})();
