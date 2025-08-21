/**
 * Hex conversion utilities for blockchain data
 *
 * Note: BigInt utilities are available in @cre/sdk/utils/values/value
 * Use val.bigint() or bigIntToProtoBigInt() for BigInt conversions
 */

/**
 * Convert hex string to Uint8Array
 */
export const hexToBytes = (hexStr: string): Uint8Array => {
  if (!hexStr.startsWith("0x")) {
    throw new Error(`Invalid hex string: ${hexStr}`);
  }
  const hex = hexStr.slice(2);
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = Number.parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
};

/**
 * Convert Uint8Array to hex string with 0x prefix
 */
export const bytesToHex = (bytes: Uint8Array): string => {
  return `0x${Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")}`;
};
