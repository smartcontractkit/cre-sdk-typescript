import { Mode } from "@cre/generated/sdk/v1alpha/sdk_pb";
import { logger, type Logger } from "@cre/sdk/logger";
import { DonModeError, NodeModeError } from "@cre/sdk/runtime/errors";
import { hostBindings } from "./runtime/host-bindings";

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

export type BaseRuntime<M extends Mode = Mode> = {
  logger: Logger;
  mode: M;
  switchModes(mode: Mode.DON | Mode.NODE): Runtime | NodeRuntime;
};

export type Runtime = BaseRuntime<Mode.DON> & {
  isNodeRuntime: false;
  assertDonSafe(): asserts this is Runtime;
};

export type NodeRuntime = BaseRuntime<Mode.NODE> & {
  isNodeRuntime: true;
  assertNodeSafe(): asserts this is NodeRuntime;
};

export const isNodeRuntime = (rt: Runtime | NodeRuntime): rt is NodeRuntime =>
  rt.isNodeRuntime === true;
export const isDonRuntime = (rt: Runtime | NodeRuntime): rt is Runtime =>
  rt.isNodeRuntime === false;

export const runtime: Runtime = {
  mode: Mode.DON,
  isNodeRuntime: false,
  logger,
  assertDonSafe: runtimeGuards.assertDonSafe,
  switchModes: (mode: Mode) => {
    hostBindings.switchModes(mode);
    runtimeGuards.setMode(mode);

    if (mode === Mode.NODE) {
      return nodeRuntime;
    }

    return runtime;
  },
};

export const nodeRuntime: NodeRuntime = {
  mode: Mode.NODE,
  isNodeRuntime: true,
  logger,
  assertNodeSafe: runtimeGuards.assertNodeSafe,
  switchModes: (mode: Mode) => {
    hostBindings.switchModes(mode);
    runtimeGuards.setMode(mode);

    if (mode === Mode.DON) {
      return runtime;
    }

    return nodeRuntime;
  },
};
