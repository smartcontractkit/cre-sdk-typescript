import { decodeAbiParameters, encodeAbiParameters, parseAbiItem } from "viem";

class Workflow {
  constructor(
    private readonly evmClient: any,
    private readonly chainSelector: any,
    private readonly contractAddress: string
  ) {}

  isResultAnomalous({ _prospectiveResult: _prospectiveResult }) {
    const humanReadableAbi =
      "function isResultAnomalous((uint256 offchainValue, int256 onchainValue, uint256 finalResult) _prospectiveResult) view returns (bool)" as const;

    const ecodedParameters = encodeAbiParameters(
      [parseAbiItem(humanReadableAbi)],
      {
        _prospectiveResult: _prospectiveResult,
      }
    );

    const dryRunCall = await this.evmClient.callContract({
      call: {
        from: "0x0000000000000000000000000000000000000000", // zero address for view calls
        to: this.contractAddress,
        data: ecodedParameters,
      },
      blockNumber: {
        absVal: "03", // 3 for finalized block
        sign: "-1", // negative
      },
    });

    const decodedParameters = decodeAbiParameters(
      [parseAbiItem(humanReadableAbi)],
      dryRunCall
    );
  }
}
