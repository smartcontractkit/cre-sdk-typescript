import { create, toJson } from '@bufbuild/protobuf'
import type { CallMsgJson } from '@cre/generated/capabilities/blockchain/evm/v1alpha/client_pb'
import type { ReportRequestJson } from '@cre/generated/sdk/v1alpha/sdk_pb'
import { BigIntSchema } from '@cre/generated/values/v1/values_pb'
import { EVMClient } from '@cre/sdk/cre'
import { bigintToBytes, bytesToBigint, hexToBase64 } from '@cre/sdk/utils/hex-utils'
import type { Address, Hex } from 'viem'

/**
 * Protobuf BigInt structure returned by SDK methods (e.g., headerByNumber).
 */
export interface ProtoBigInt {
	absVal: Uint8Array
	sign: bigint
}

/**
 * Converts a native JS bigint to a protobuf BigInt JSON representation.
 * Use this when passing bigint values to SDK methods.
 *
 * @example
 * const response = evmClient.callContract(runtime, {
 *   call: encodeCallMsg({...}),
 *   blockNumber: bigintToProtoBigInt(9768438n)
 * }).result()
 *
 * @param n - The native bigint, number, or string value.
 * @returns The protobuf BigInt JSON representation.
 */
export const bigintToProtoBigInt = (n: number | bigint | string) => {
	const val = BigInt(n)
	const abs = val < 0n ? -val : val

	const msg = create(BigIntSchema, {
		absVal: bigintToBytes(abs),
	})

	return toJson(BigIntSchema, msg)
}

/**
 * Converts a protobuf BigInt to a native JS bigint.
 * Use this when extracting bigint values from SDK responses.
 *
 * @example
 * const latestHeader = evmClient.headerByNumber(runtime, {}).result()
 * const latestBlockNum = protoBigIntToBigint(latestHeader.header.blockNumber!)
 * const customBlock = latestBlockNum - 500n
 *
 * @param pb - The protobuf BigInt object with absVal and sign fields.
 * @returns The native JS bigint value.
 */
export const protoBigIntToBigint = (pb: ProtoBigInt): bigint => {
	const result = bytesToBigint(pb.absVal)
	return pb.sign < 0n ? -result : result
}

/**
 * Convenience alias for `bigintToProtoBigInt`.
 * Creates a block number object for EVM capability requests.
 *
 * @param n - The block number.
 * @returns The protobuf BigInt JSON representation.
 */
export const blockNumber = bigintToProtoBigInt

/**
 * EVM Capability Helper.
 *
 * `CallContractRequest`, used by EVM capability, has arguments for reading a contract as specified in the call message at a block height defined by blockNumber.
 * That blockNumber can be:
 *  - the latest mined block (`LATEST_BLOCK_NUMBER`) (default)
 * 	- the last finalized block (`LAST_FINALIZED_BLOCK_NUMBER`)
 *  - a specific block number (use `blockNumber(n)` or `bigintToProtoBigInt(n)`)
 *
 * Using this constant will indicate that the call should be executed at the last finalized block.
 */
export const LAST_FINALIZED_BLOCK_NUMBER = {
	absVal: Buffer.from([3]).toString('base64'), // 3 for finalized block
	sign: '-1',
}

/**
 * EVM Capability Helper.
 *
 * `CallContractRequest`, used by EVM capability, has arguments for reading a contract as specified in the call message at a block height defined by blockNumber.
 * That blockNumber can be:
 *  - the latest mined block (`LATEST_BLOCK_NUMBER`) (default)
 * 	- the last finalized block (`LAST_FINALIZED_BLOCK_NUMBER`)
 *
 * Using this constant will indicate that the call should be executed at the latest mined block.
 */
export const LATEST_BLOCK_NUMBER = {
	absVal: Buffer.from([2]).toString('base64'), // 2 for the latest block
	sign: '-1',
}

export interface EncodeCallMsgPayload {
	from: Address
	to: Address
	data: Hex
}

/**
 * Encodes a call message payload into a `CallMsgJson` protobuf structure, expected by the EVM capability.
 *
 * When creating a `CallContractRequest` 3 parameters are required:
 *
 * - `from` - The sender address.
 * - `to` - The contract address.
 * - `data` - The data to call the contract with.
 *
 * This helper wraps that data and packs into format acceptable by the EVM capability.
 *
 * @param payload - The call message payload to encode.
 * @returns The encoded call message payload.
 */
export const encodeCallMsg = (payload: EncodeCallMsgPayload): CallMsgJson => ({
	from: hexToBase64(payload.from),
	to: hexToBase64(payload.to),
	data: hexToBase64(payload.data),
})

/**
 * Default values expected by the EVM capability for report encoding.
 */
export const EVM_DEFAULT_REPORT_ENCODER = {
	encoderName: 'evm',
	signingAlgo: 'ecdsa',
	hashingAlgo: 'keccak256',
}

/**
 * Prepares a report request for the EVM capability to pass to `.report()` function.
 *
 * @param hexEncodedPayload - The hex encoded payload to be signed.
 * @param reportEncoder - The report encoder to be used. Defaults to EVM_DEFAULT_REPORT_ENCODER.
 * @returns The prepared report request.
 */
export const prepareReportRequest = (
	hexEncodedPayload: Hex,
	reportEncoder: Exclude<ReportRequestJson, 'encodedPayload'> = EVM_DEFAULT_REPORT_ENCODER,
): ReportRequestJson => ({
	encodedPayload: hexToBase64(hexEncodedPayload),
	...reportEncoder,
})

export const isChainSelectorSupported = (chainSelectorName: string) =>
	Object.keys(EVMClient.SUPPORTED_CHAIN_SELECTORS).includes(chainSelectorName)
