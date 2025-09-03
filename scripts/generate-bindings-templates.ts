export function generateImports() {
  return `
import { decodeAbiParameters, encodeAbiParameters, parseAbiItem } from "viem";
  `;
}

export function generateClass(name: string, content: string) {
  return `
class ${name} {
  constructor(
    private readonly evmClient: any,
    private readonly chainSelector: any,
    private readonly contractAddress: string,
  ) {}

  ${content}
}
  `;
}
