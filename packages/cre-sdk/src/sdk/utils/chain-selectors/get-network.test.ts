import { afterAll, beforeAll, describe, expect, it, mock } from "bun:test";
// Import original module to restore it later
import * as originalNetworks from "@cre/generated/networks";
import type { NetworkInfo } from "./types";

// Mock the generated networks module with deterministic fixtures
const mockModulePath = "@cre/generated/networks";

const evmMain = {
  chainId: "1",
  chainSelector: { name: "EVM_MAIN", selector: 100n },
  chainFamily: "evm",
  networkType: "mainnet",
} as const;

const evmTest = {
  chainId: "5",
  chainSelector: { name: "EVM_TEST", selector: 200n },
  chainFamily: "evm",
  networkType: "testnet",
} as const;

const solMain = {
  chainId: "sol-main",
  chainSelector: { name: "SOL_MAIN", selector: 300n },
  chainFamily: "solana",
  networkType: "mainnet",
} as const;

const solTest = {
  chainId: "sol-test",
  chainSelector: { name: "SOL_TEST", selector: 400n },
  chainFamily: "solana",
  networkType: "testnet",
} as const;

// Create all maps required by getNetwork
const mainnetBySelector = new Map<bigint, any>([
  [evmMain.chainSelector.selector, evmMain],
  [solMain.chainSelector.selector, solMain],
]);
const testnetBySelector = new Map<bigint, any>([
  [evmTest.chainSelector.selector, evmTest],
  [solTest.chainSelector.selector, solTest],
]);
const mainnetByName = new Map<string, any>([
  [evmMain.chainSelector.name, evmMain],
  [solMain.chainSelector.name, solMain],
]);
const testnetByName = new Map<string, any>([
  [evmTest.chainSelector.name, evmTest],
  [solTest.chainSelector.name, solTest],
]);

const mainnetBySelectorByFamily = {
  evm: new Map<bigint, any>([[evmMain.chainSelector.selector, evmMain]]),
  solana: new Map<bigint, any>([[solMain.chainSelector.selector, solMain]]),
  aptos: new Map(),
  sui: new Map(),
  ton: new Map(),
  tron: new Map(),
} as const;

const testnetBySelectorByFamily = {
  evm: new Map<bigint, any>([[evmTest.chainSelector.selector, evmTest]]),
  solana: new Map<bigint, any>([[solTest.chainSelector.selector, solTest]]),
  aptos: new Map(),
  sui: new Map(),
  ton: new Map(),
  tron: new Map(),
} as const;

const mainnetByNameByFamily = {
  evm: new Map<string, any>([[evmMain.chainSelector.name, evmMain]]),
  solana: new Map<string, any>([[solMain.chainSelector.name, solMain]]),
  aptos: new Map(),
  sui: new Map(),
  ton: new Map(),
  tron: new Map(),
} as const;

const testnetByNameByFamily = {
  evm: new Map<string, any>([[evmTest.chainSelector.name, evmTest]]),
  solana: new Map<string, any>([[solTest.chainSelector.name, solTest]]),
  aptos: new Map(),
  sui: new Map(),
  ton: new Map(),
  tron: new Map(),
} as const;

describe("getNetwork", () => {
  let getNetwork: (options: any) => NetworkInfo | undefined;

  beforeAll(async () => {
    // Install module mock before importing the SUT
    mock.module(mockModulePath, () => ({
      mainnetByName,
      mainnetByNameByFamily,
      mainnetBySelector,
      mainnetBySelectorByFamily,
      testnetByName,
      testnetByNameByFamily,
      testnetBySelector,
      testnetBySelectorByFamily,
    }));

    const module = await import("./get-network");
    getNetwork = module.getNetwork;
  });

  afterAll(async () => {
    // Explicitly unmock the module to prevent pollution of other test files
    // Clear the mock by setting it to undefined, then restore
    mock.module(mockModulePath, undefined);
    mock.restore();
    // Force clear module cache by re-importing
    delete (globalThis as any).Bun?.moduleCache?.[mockModulePath];
  });

  it("returns undefined when neither chainSelector nor chainSelectorName provided", () => {
    expect(getNetwork({})).toBeUndefined();
  });

  // chainFamily + chainSelector
  it("uses family+selector with isTestnet=true (testnet family map)", () => {
    const result = getNetwork({
      chainFamily: "evm",
      chainSelector: 200n,
      isTestnet: true,
    });
    expect(result).toEqual(evmTest);
  });

  it("uses family+selector with isTestnet=false (mainnet family map)", () => {
    const result = getNetwork({
      chainFamily: "evm",
      chainSelector: 100n,
      isTestnet: false,
    });
    expect(result).toEqual(evmMain);
  });

  it("uses family+selector with isTestnet undefined defaults to mainnet map", () => {
    const result = getNetwork({ chainFamily: "solana", chainSelector: 300n });
    expect(result).toEqual(solMain);
  });

  it("uses family+selector with isTestnet undefined prefers testnet when present", () => {
    const result = getNetwork({ chainFamily: "evm", chainSelector: 200n });
    expect(result).toEqual(evmTest);
  });

  it("family+selector returns undefined when selector not in that family", () => {
    const result = getNetwork({
      chainFamily: "evm",
      chainSelector: 300n,
      isTestnet: false,
    });
    expect(result).toBeUndefined();
  });

  // chainFamily + chainSelectorName
  it("uses family+name with isTestnet=true (testnet family map)", () => {
    const result = getNetwork({
      chainFamily: "solana",
      chainSelectorName: "SOL_TEST",
      isTestnet: true,
    });
    expect(result).toEqual(solTest);
  });

  it("uses family+name with isTestnet=false (mainnet family map)", () => {
    const result = getNetwork({
      chainFamily: "solana",
      chainSelectorName: "SOL_MAIN",
      isTestnet: false,
    });
    expect(result).toEqual(solMain);
  });

  it("uses family+name with isTestnet undefined defaults to mainnet map", () => {
    const result = getNetwork({
      chainFamily: "evm",
      chainSelectorName: "EVM_MAIN",
    });
    expect(result).toEqual(evmMain);
  });

  it("uses family+name with isTestnet undefined prefers testnet when present", () => {
    const result = getNetwork({
      chainFamily: "evm",
      chainSelectorName: "EVM_TEST",
    });
    expect(result).toEqual(evmTest);
  });

  it("family+name returns undefined when name not in that family", () => {
    const result = getNetwork({
      chainFamily: "solana",
      chainSelectorName: "EVM_MAIN",
      isTestnet: false,
    });
    expect(result).toBeUndefined();
  });

  // selector only
  it("selector only with isTestnet=false returns mainnet", () => {
    const result = getNetwork({ chainSelector: 100n, isTestnet: false });
    expect(result).toEqual(evmMain);
  });

  it("selector only with isTestnet=true returns testnet", () => {
    const result = getNetwork({ chainSelector: 200n, isTestnet: true });
    expect(result).toEqual(evmTest);
  });

  it("selector only with isTestnet undefined prefers testnet if exists", () => {
    // create duplicate selector present in both maps to assert preference
    const dupMain = {
      ...evmMain,
      chainSelector: {
        ...evmMain.chainSelector,
        selector: 900n,
        name: "DUP_MAIN",
      },
    };
    const dupTest = {
      ...evmTest,
      chainSelector: {
        ...evmTest.chainSelector,
        selector: 900n,
        name: "DUP_TEST",
      },
    };
    mainnetBySelector.set(900n, dupMain);
    testnetBySelector.set(900n, dupTest);

    const result = getNetwork({ chainSelector: 900n });
    expect(result).toEqual(dupTest);
  });

  it("selector only with isTestnet undefined falls back to mainnet if not in testnet", () => {
    const result = getNetwork({ chainSelector: 300n });
    expect(result).toEqual(solMain);
  });

  it("selector only returns undefined when not found anywhere", () => {
    const result = getNetwork({ chainSelector: 9999n });
    expect(result).toBeUndefined();
  });

  // both selector and name provided - selector takes precedence
  it("both selector and name provided without family uses selector path", () => {
    const result = getNetwork({
      chainSelector: 100n,
      chainSelectorName: "SOL_MAIN",
      isTestnet: false,
    });
    expect(result).toEqual(evmMain);
  });

  it("both selector and name provided with family uses selector path", () => {
    const result = getNetwork({
      chainFamily: "solana",
      chainSelector: 300n,
      chainSelectorName: "EVM_MAIN",
    });
    expect(result).toEqual(solMain);
  });

  it("both selector and name provided prefers testnet by selector when isTestnet undefined", () => {
    // ensure duplicate in both maps like earlier
    const dupMain = {
      ...evmMain,
      chainSelector: {
        ...evmMain.chainSelector,
        selector: 901n,
        name: "DUP2_MAIN",
      },
    };
    const dupTest = {
      ...evmTest,
      chainSelector: {
        ...evmTest.chainSelector,
        selector: 901n,
        name: "DUP2_TEST",
      },
    };
    mainnetBySelector.set(901n, dupMain);
    testnetBySelector.set(901n, dupTest);

    const result = getNetwork({
      chainSelector: 901n,
      chainSelectorName: "DUP2_MAIN",
    });
    expect(result).toEqual(dupTest);
  });

  // name only
  it("name only with isTestnet=false returns mainnet", () => {
    const result = getNetwork({
      chainSelectorName: "EVM_MAIN",
      isTestnet: false,
    });
    expect(result).toEqual(evmMain);
  });

  it("name only with isTestnet=true returns testnet", () => {
    const result = getNetwork({
      chainSelectorName: "EVM_TEST",
      isTestnet: true,
    });
    expect(result).toEqual(evmTest);
  });

  it("name only with isTestnet undefined prefers testnet if exists", () => {
    // For names, ensure both entries exist for a shared name key
    mainnetByName.set("DUP", evmMain);
    testnetByName.set("DUP", evmTest);
    const result = getNetwork({ chainSelectorName: "DUP" });
    expect(result).toEqual(evmTest);
  });

  it("name only with isTestnet undefined falls back to mainnet if not in testnet", () => {
    const result = getNetwork({ chainSelectorName: "SOL_MAIN" });
    expect(result).toEqual(solMain);
  });

  it("returns undefined for non-existent chainSelectorName", () => {
    const result = getNetwork({ chainSelectorName: "UNKNOWN_NAME" });
    expect(result).toBeUndefined();
  });

  it("returns undefined for unsupported family when maps are empty (selector)", () => {
    const result = getNetwork({
      chainFamily: "aptos",
      chainSelector: 100n,
      isTestnet: false,
    });
    expect(result).toBeUndefined();
  });

  it("returns undefined for unsupported family when maps are empty (name)", () => {
    const result = getNetwork({
      chainFamily: "aptos",
      chainSelectorName: "EVM_MAIN",
      isTestnet: false,
    });
    expect(result).toBeUndefined();
  });
});
