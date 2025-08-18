import { Mode } from "@cre/generated/sdk/v1alpha/sdk_pb";

// Tracks async requests using DON mode, increments to the positive side, 0, 1, 2, 3 ...
let donCall = 0;

// Tracks async requests using Node mode, increments to the negative side, -1, -2, -3, -4 ...
let nodeCall = -1;

export const getLastCallbackId = (mode: Mode): number => {
  if (mode !== Mode.DON && mode !== Mode.NODE) {
    throw new Error(`Unsupported capability mode: ${mode}`);
  }

  return mode === Mode.DON ? donCall : nodeCall;
};

export const incrementCallbackId = (mode: Mode): number => {
  if (mode !== Mode.DON && mode !== Mode.NODE) {
    throw new Error(`Unsupported capability mode: ${mode}`);
  }

  if (mode === Mode.DON) {
    donCall++;
    return donCall;
  }

  nodeCall--;
  return nodeCall;
};
