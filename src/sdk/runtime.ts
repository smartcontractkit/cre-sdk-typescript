import { Mode } from "@cre/generated/sdk/v1alpha/sdk_pb";
import { logger, type Logger } from "@cre/sdk/logger";
import { DonModeError, NodeModeError } from "@cre/sdk/runtime/errors";

/**
 * Runtime guards are not actually causing / throwing errors.
 * They pre-set the errors, depending on the current mode and then
 * assert methods are used to check if feature can be called in given mode.
 * If not the prepared error will be thrown.
 */
export const runtimeGuards = (() => {
  let currentMode: Mode = Mode.DON;
  let donModeGuardError: Error | null = null;
  let nodeModeGuardError: Error | null = null;

  const setMode = (mode: Mode) => {
    currentMode = mode;
    if (mode === Mode.NODE) {
      // In node mode, forbid DON runtime calls
      donModeGuardError = new DonModeError();
      nodeModeGuardError = null;
    } else if (mode === Mode.DON) {
      // Back in DON mode, forbid node runtime calls
      nodeModeGuardError = new NodeModeError();
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

export type BaseRuntime = {
  logger: Logger;
  getMode: () => Mode;
  setMode: (mode: Mode) => void;
};

export type Runtime = BaseRuntime & {
  isNodeRuntime: false;
  assertDonSafe: () => void;
};

export type NodeRuntime = BaseRuntime & {
  isNodeRuntime: true;
  assertNodeSafe: () => void;
};

export const runtime: BaseRuntime = {
  logger,
  setMode: runtimeGuards.setMode,
  getMode: runtimeGuards.getMode,
  switchModes: (mode: Mode): void => {
    g.switchModes?.(mode);
    runtimeGuards.setMode(mode);
  },
};
