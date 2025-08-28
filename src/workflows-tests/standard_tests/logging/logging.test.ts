import { describe, test, expect, mock } from "bun:test";
import { main } from "../../../workflows/standard_tests/logging/testts";

describe('workflows/standard_tests/logging', () => {
  test('should run a standard test workflow', async () => {
    await main();

    expect(globalThis.log).toHaveBeenCalledWith('log from wasm!');
    expect(globalThis.log).toHaveBeenCalledTimes(1);
  });
});
