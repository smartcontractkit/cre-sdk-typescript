import {
  type Abi,
  type AbiFunction,
  decodeFunctionData,
  encodeFunctionResult,
  type Address,
  type Hex,
} from "viem"
import type {
  CallContractReply,
  CallContractReplyJson,
  CallContractRequest,
  GasConfig,
  WriteReportReply,
  WriteReportReplyJson,
  WriteReportRequest,
} from "@cre/generated/capabilities/blockchain/evm/v1alpha/client_pb"
import type { ReportResponse } from "@cre/generated/sdk/v1alpha/sdk_pb"
import type { EvmMock } from "./generated"

type ViewFunction = AbiFunction & { stateMutability: "view" | "pure" }

type ExtractViewFunctionNames<TAbi extends Abi> = Extract<
  TAbi[number],
  ViewFunction
>["name"]

/**
 * Strict version of {@link WriteReportRequest} where `report` and `gasConfig`
 * are guaranteed to be present. Used by mock handlers so tests don't need
 * to check for undefined.
 */
export interface WriteReportMockInput {
  receiver: Uint8Array
  report: ReportResponse
  gasConfig: GasConfig
}

/**
 * A contract mock returned by {@link addContractMock}.
 *
 * Each view/pure function in the ABI becomes an optional property whose value
 * is a handler function. When set, calls to that function on the mock EVM
 * client are automatically routed, decoded, and re-encoded.
 *
 * A special `writeReport` property handles write-report calls to this
 * contract's address. Its handler receives a {@link WriteReportMockInput}
 * where `report` and `gasConfig` are guaranteed to be present.
 */
export type ContractMock<TAbi extends Abi> = {
  [K in ExtractViewFunctionNames<TAbi>]?: (
    ...args: readonly unknown[]
  ) => unknown
} & {
  writeReport?: (
    input: WriteReportMockInput
  ) => WriteReportReply | WriteReportReplyJson
}

export interface AddContractMockOptions<TAbi extends Abi> {
  address: Address
  abi: TAbi
}

function bytesToHexAddress(bytes: Uint8Array): string {
  return `0x${Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")}`.toLowerCase()
}

function bytesToHex(bytes: Uint8Array): Hex {
  return `0x${Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")}`
}

function hexToUint8Array(hex: Hex): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex
  const bytes = new Uint8Array(clean.length / 2)
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = Number.parseInt(clean.slice(i, i + 2), 16)
  }
  return bytes
}

/**
 * Registers a typed contract mock on an {@link EvmMock} instance.
 *
 * This is the TypeScript equivalent of Go's `evmmock.AddContractMock`.
 * It intercepts `callContract` and `writeReport` on the provided mock,
 * routing calls by contract address and ABI method selector.
 *
 * Multiple contracts can be mocked on the same `EvmMock` — each call to
 * `addContractMock` chains with the previous handler.
 *
 * @example
 * ```ts
 * const evmMock = EvmMock.testInstance(chainSelector);
 *
 * const balanceMock = addContractMock(evmMock, {
 *   address: "0x1234...",
 *   abi: BalanceReader,
 * });
 *
 * balanceMock.getNativeBalances = (addresses) => {
 *   return [500000000000000000n];
 * };
 * ```
 *
 * @param evmMock - The `EvmMock` instance to attach to.
 * @param options - Contract address and viem-compatible ABI.
 * @returns A mock object with settable handler properties for each view/pure function.
 */
export function addContractMock<const TAbi extends Abi>(
  evmMock: EvmMock,
  options: AddContractMockOptions<TAbi>
): ContractMock<TAbi> {
  const mock = {} as ContractMock<TAbi>
  const normalizedAddress = options.address.toLowerCase()

  const previousCallContract = evmMock.callContract
  evmMock.callContract = (
    req: CallContractRequest
  ): CallContractReply | CallContractReplyJson => {
    const toBytes = req.call?.to
    if (!toBytes || bytesToHexAddress(toBytes) !== normalizedAddress) {
      if (previousCallContract) return previousCallContract(req)
      throw new Error(
        `addContractMock: no mock registered for address ${
          toBytes ? bytesToHexAddress(toBytes) : "(empty)"
        }`
      )
    }

    const dataBytes = req.call?.data
    if (!dataBytes || dataBytes.length < 4) {
      throw new Error(
        "addContractMock: call data too short (need at least 4 bytes for selector)"
      )
    }

    const callDataHex = bytesToHex(dataBytes)

    let decoded: { functionName: string; args: readonly unknown[] | undefined }
    try {
      decoded = decodeFunctionData({
        abi: options.abi,
        data: callDataHex,
      }) as { functionName: string; args: readonly unknown[] | undefined }
    } catch (e) {
      if (previousCallContract) return previousCallContract(req)
      throw new Error(
        `addContractMock: failed to decode function data for ${
          options.address
        }: ${e instanceof Error ? e.message : e}`
      )
    }

    const handler = (
      mock as Record<
        string,
        ((...a: readonly unknown[]) => unknown) | undefined
      >
    )[decoded.functionName]
    if (typeof handler !== "function") {
      throw new Error(
        `addContractMock: no handler set for ${decoded.functionName} on ${options.address}`
      )
    }

    const result = handler(...(decoded.args ?? []))

    const encoded = encodeFunctionResult({
      abi: options.abi as Abi,
      functionName: decoded.functionName,
      result: result as never,
    })

    return {
      data: hexToUint8Array(encoded),
    } as unknown as CallContractReplyJson
  }

  const previousWriteReport = evmMock.writeReport
  evmMock.writeReport = (
    req: WriteReportRequest
  ): WriteReportReply | WriteReportReplyJson => {
    const receiverBytes = req.receiver
    if (
      !receiverBytes ||
      bytesToHexAddress(receiverBytes) !== normalizedAddress
    ) {
      if (previousWriteReport) return previousWriteReport(req)
      throw new Error(
        `addContractMock: no writeReport mock registered for receiver ${
          receiverBytes ? bytesToHexAddress(receiverBytes) : "(empty)"
        }`
      )
    }

    if (typeof mock.writeReport !== "function") {
      throw new Error(
        `addContractMock: no writeReport handler set for ${options.address}`
      )
    }

    if (!req.report) {
      throw new Error(
        `addContractMock: writeReport called without report for ${options.address}`
      )
    }
    if (!req.gasConfig) {
      throw new Error(
        `addContractMock: writeReport called without gasConfig for ${options.address}`
      )
    }

    return mock.writeReport({
      receiver: req.receiver,
      report: req.report,
      gasConfig: req.gasConfig,
    })
  }

  return mock
}
