import { type MessageInitShape } from '@bufbuild/protobuf'
import type { CallMsgSchema } from '@cre/generated/capabilities/blockchain/evm/v1alpha/client_pb'
import type { ReportRequestSchema } from '@cre/generated/sdk/v1alpha/sdk_pb'
import {
	type BigIntSchema,
	type BigInt as GeneratedBigInt,
} from '@cre/generated/values/v1/values_pb'
import { EVMClient } from '@cre/sdk/cre'
import { bigintToBytes, bytesToBigint, hexToBase64, hexToBytes } from '@cre/sdk/utils/hex-utils'
import type { Address, Hex } from 'viem'

/**
 * Protobuf BigInt structure returned by SDK methods (e.g., headerByNumber).
 * Uses Pick to extract just the data fields from the generated type.
 */
export type ProtoBigInt = Pick<GeneratedBigInt, 'absVal' | 'sign'>

/**
 * Converts a native JS bigint to a protobuf BigInt initializer.
 * Use this when passing bigint values to SDK methods.
 *
 * @example
 * const response = evmClient.callContract(runtime, {
 *   call: encodeCallMsg({...}),
 *   blockNumber: bigintToProtoBigInt(9768438n)
 * }).result()
 *
 * @param n - The native bigint, number, or string value.
 * @returns The protobuf BigInt initializer with native types.
 */
export const bigintToProtoBigInt = (
	n: number | bigint | string,
): MessageInitShape<typeof BigIntSchema> => {
	if (typeof n === 'number' && (!Number.isFinite(n) || !Number.isInteger(n))) {
		throw new Error(`bigintToProtoBigInt requires an integer number, received ${n}`)
	}
	const val = BigInt(n)
	const abs = val < 0n ? -val : val
	const sign = val === 0n ? 0n : val < 0n ? -1n : 1n

	return {
		absVal: bigintToBytes(abs),
		sign,
	}
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
export const LAST_FINALIZED_BLOCK_NUMBER: MessageInitShape<typeof BigIntSchema> = {
	absVal: new Uint8Array([3]), // 3 for finalized block
	sign: -1n,
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
export const LATEST_BLOCK_NUMBER: MessageInitShape<typeof BigIntSchema> = {
	absVal: new Uint8Array([2]), // 2 for the latest block
	sign: -1n,
}

export interface EncodeCallMsgPayload {
	from: Address
	to: Address
	data: Hex
}

/**
 * Encodes a call message payload into a CallMsg initializer, expected by the EVM capability.
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
 * @returns The encoded call message payload with native types.
 */
export const encodeCallMsg = (
	payload: EncodeCallMsgPayload,
): MessageInitShape<typeof CallMsgSchema> => {
	const encodeField = (fieldName: string, value: string): Uint8Array => {
		try {
			return hexToBytes(value)
		} catch (e) {
			throw new Error(
				`Invalid hex in '${fieldName}' field of CallMsg: ${e instanceof Error ? e.message : String(e)}`,
			)
		}
	}

	return {
		from: encodeField('from', payload.from),
		to: encodeField('to', payload.to),
		data: encodeField('data', payload.data),
	}
}

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
	reportEncoder: Exclude<
		MessageInitShape<typeof ReportRequestSchema>,
		'encodedPayload'
	> = EVM_DEFAULT_REPORT_ENCODER,
): MessageInitShape<typeof ReportRequestSchema> => ({
	encodedPayload: hexToBytes(hexEncodedPayload),
	...reportEncoder,
})

/**
 * Validates a hex string and checks that the decoded bytes have the expected length.
 */
const validateHexByteLength = (hex: string, expectedBytes: number, fieldLabel: string): string => {
	const bytes = hexToBytes(hex)
	if (bytes.length !== expectedBytes) {
		throw new Error(
			`Invalid ${fieldLabel}: expected ${expectedBytes} bytes, got ${bytes.length} bytes from '${hex.length > 200 ? hex.slice(0, 200) + '...' : hex}'. EVM ${fieldLabel}s must be exactly ${expectedBytes} bytes.`,
		)
	}
	return hexToBase64(hex)
}

export interface LogTriggerConfigOptions {
	/** EVM addresses to monitor — hex strings with 0x prefix (20 bytes each) */
	addresses: Hex[]
	/** Topic filters — array of up to 4 arrays of hex topic values (32 bytes each).
	 *  - topics[0]: event signatures (keccak256 hashes), at least one required
	 *  - topics[1]: possible values for first indexed arg (optional)
	 *  - topics[2]: possible values for second indexed arg (optional)
	 *  - topics[3]: possible values for third indexed arg (optional)
	 */
	topics?: Hex[][]
	/** Confidence level for log finality. Defaults to SAFE. */
	confidence?: 'SAFE' | 'LATEST' | 'FINALIZED'
}

/**
 * Creates a log trigger configuration from hex-encoded addresses and topics.
 *
 * This helper converts hex addresses and topic hashes to the base64-encoded format
 * expected by the EVM capability's `FilterLogTriggerRequest`, and validates that
 * addresses are 20 bytes and topics are 32 bytes.
 *
 * @example
 * const WETH = '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9'
 * const TRANSFER = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
 *
 * handler(
 *   evmClient.logTrigger(logTriggerConfig({
 *     addresses: [WETH],
 *     topics: [[TRANSFER]],
 *     confidence: 'LATEST',
 *   })),
 *   onLogTrigger,
 * )
 *
 * @param opts - Hex-encoded addresses, topic filters, and optional confidence level.
 * @returns The `FilterLogTriggerRequestJson` ready to pass to `evmClient.logTrigger()`.
 */
export const logTriggerConfig = (opts: LogTriggerConfigOptions) => {
	if (!opts.addresses || opts.addresses.length === 0) {
		throw new Error(
			'logTriggerConfig requires at least one address. Provide an array of hex-encoded EVM addresses (20 bytes each).',
		)
	}

	const addresses = opts.addresses.map((addr, i) => {
		try {
			return validateHexByteLength(addr, 20, 'address')
		} catch (e) {
			throw new Error(
				`Invalid address at index ${i}: ${e instanceof Error ? e.message : String(e)}`,
			)
		}
	})

	const topics = opts.topics?.map((topicSlot, slotIndex) => ({
		values: topicSlot.map((topic, valueIndex) => {
			try {
				return validateHexByteLength(topic, 32, 'topic')
			} catch (e) {
				throw new Error(
					`Invalid topic at topics[${slotIndex}][${valueIndex}]: ${e instanceof Error ? e.message : String(e)}`,
				)
			}
		}),
	}))

	const confidence = opts.confidence ? `CONFIDENCE_LEVEL_${opts.confidence}` : undefined

	return {
		addresses,
		...(topics ? { topics } : {}),
		...(confidence ? { confidence } : {}),
	}
}

export const isChainSelectorSupported = (chainSelectorName: string) =>
	Object.keys(EVMClient.SUPPORTED_CHAIN_SELECTORS).includes(chainSelectorName)
