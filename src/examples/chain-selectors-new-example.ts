// Example usage of the new chain selectors structure

import {
  getAllNetworks,
  getNetworkBySelector,
  getNetworksByFamily,
  getNetworkByFamilyAndChainId,
  getNetworkByChainSelectorName,
  type ChainFamily,
} from "../sdk/utils/chain-selectors";

// Import specific network files
import ethereumMainnet from "../generated/chain-selectors/evm/ethereum-mainnet";
import solanaMainnet from "../generated/chain-selectors/solana/solana-mainnet";

const main = () => {
  console.log("🔗 New Chain Selectors Structure Examples\n");

  // Example 1: Direct import of specific networks
  console.log("📋 Example 1: Direct network imports");
  console.log(`Ethereum Mainnet: ${ethereumMainnet.chainSelector.name}`);
  console.log(`Selector: ${ethereumMainnet.chainSelector.selector}`);
  console.log(`Chain ID: ${ethereumMainnet.chainId}`);
  console.log(`Family: ${ethereumMainnet.chainFamily}\n`);

  console.log(`Solana Mainnet: ${solanaMainnet.chainSelector.name}`);
  console.log(`Selector: ${solanaMainnet.chainSelector.selector}\n`);

  // Example 2: Using utility functions
  console.log("🔍 Example 2: Utility functions");
  const networkBySelector = getNetworkBySelector("5009297550715158000");
  if (networkBySelector) {
    console.log(`Found by selector: ${networkBySelector.chainSelector.name}`);
  }

  const networkByName = getNetworkByChainSelectorName("ethereum-mainnet");
  if (networkByName) {
    console.log(`Found by name: ${networkByName.chainSelector.name}`);
  }

  const evmNetwork = getNetworkByFamilyAndChainId("evm", "1");
  if (evmNetwork) {
    console.log(`EVM Chain ID 1: ${evmNetwork.chainSelector.name}\n`);
  }

  // Example 3: Get networks by family
  console.log("🌐 Example 3: Networks by family");
  const families: ChainFamily[] = [
    "evm",
    "solana",
    "aptos",
    "sui",
    "ton",
    "tron",
  ];

  for (const family of families) {
    const networks = getNetworksByFamily(family);
    console.log(`${family.toUpperCase()}: ${networks.length} networks`);

    // Show first 2 networks as examples
    networks.slice(0, 2).forEach((network) => {
      console.log(`  - ${network.chainSelector.name} (${network.chainId})`);
    });
    console.log();
  }

  // Example 4: All networks
  console.log("📊 Example 4: All networks");
  const allNetworks = getAllNetworks();
  console.log(`Total networks: ${allNetworks.length}`);

  // Example 5: Find specific networks
  console.log("\n🎯 Example 5: Find specific networks");
  const polygonNetworks = allNetworks.filter((n) =>
    n.chainSelector.name.includes("polygon")
  );
  console.log(`Polygon networks found: ${polygonNetworks.length}`);
  polygonNetworks.forEach((network) => {
    console.log(`  - ${network.chainSelector.name} (${network.chainId})`);
  });
};

if (import.meta.main) {
  main();
}
