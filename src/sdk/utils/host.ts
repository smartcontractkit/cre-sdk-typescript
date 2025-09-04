import { Mode } from "@cre/generated/sdk/v1alpha/sdk_pb";
import { hostBindings } from "../runtime/host-bindings";

export const host = {
  switchModes: (mode: Mode): void => {
    hostBindings.switchModes(mode);
    runtimeGuards.setMode(mode);
  },
  log: (message: string): void => hostBindings.log(String(message)),
  sendResponse: (payloadBase64: string): number =>
    hostBindings.sendResponse(payloadBase64),
  randomSeed: (mode: Mode.DON | Mode.NODE = Mode.DON): number =>
    hostBindings.randomSeed(mode),
  versionV2: (): void => hostBindings.versionV2(),
  callCapability: (request: string): number =>
    hostBindings.callCapability(request),
  awaitCapabilities: (awaitRequest: string, maxResponseLen: number): string =>
    hostBindings.awaitCapabilities(awaitRequest, maxResponseLen),
  getSecrets: (request: string, maxResponseLen: number): number =>
    hostBindings.getSecrets(request, maxResponseLen),
  awaitSecrets: (awaitRequest: string, maxResponseLen: number): string =>
    hostBindings.awaitSecrets(awaitRequest, maxResponseLen),
  getWasiArgs: (): string => hostBindings.getWasiArgs(),
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
