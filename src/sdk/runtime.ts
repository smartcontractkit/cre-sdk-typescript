import { Mode } from "@cre/generated/sdk/v1alpha/sdk_pb";
import { logger, type Logger } from "@cre/sdk/logger";

export type Runtime = {
  mode: Mode;
  logger: Logger;
};

export const runtime: Runtime = {
  mode: Mode.DON,
  logger,
};

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
