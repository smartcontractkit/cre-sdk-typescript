import type {
	AccountMetaJson,
	ComputeConfigJson,
	CPIFilterConfigJson,
	Log,
} from '@cre/generated/capabilities/blockchain/solana/v1alpha/client_pb'
import type { ReportRequestJson } from '@cre/generated/sdk/v1alpha/sdk_pb'
import { bytesToBase64 } from '@cre/sdk/utils/hex-utils'
import { sha256 } from '@noble/hashes/sha2.js'
import { concatBytes } from '@noble/hashes/utils.js'
import { address, getAddressEncoder } from '@solana/addresses'
import { prepareReportRequestFromBytes, type ReportEncoder } from '../report-helpers'

const ACCOUNT_HASH_LENGTH = 32
const U32_LENGTH = 4

// Stateless address encoder; hoisted so the encoder stack isn't rebuilt per call.
const ADDRESS_ENCODER = getAddressEncoder()

/** Encodes a number as a little-endian Borsh u32. */
const u32LE = (value: number): Uint8Array => {
	const bytes = new Uint8Array(U32_LENGTH)
	new DataView(bytes.buffer).setUint32(0, value, true)
	return bytes
}

/**
 * An account passed to the Solana capability's `remainingAccounts` list.
 * Build instances with {@link solanaAccountMeta}; generated bindings convert
 * to the capability's protobuf JSON shape internally.
 */
export interface SolanaAccountMeta {
	publicKey: Uint8Array
	isWritable: boolean
}

/**
 * Compute settings for a Solana write-report request. Mirrors the
 * capability's `ComputeConfig` protobuf JSON shape.
 */
export type SolanaComputeConfig = ComputeConfigJson

/**
 * The minimal account shape needed by {@link calculateAccountsHash} —
 * only the public key participates in the hash. Structurally compatible
 * with both {@link SolanaAccountMeta} and the capability's protobuf
 * `AccountMeta`.
 */
export type SolanaAccountInput = Pick<SolanaAccountMeta, 'publicKey'> &
	Partial<Pick<SolanaAccountMeta, 'isWritable'>>

/**
 * Converts a base58-encoded Solana address to its 32 raw bytes.
 *
 * @param base58Address - The base58-encoded address (validated).
 * @returns The 32-byte public key.
 */
export const solanaAddressToBytes = (base58Address: string): Uint8Array =>
	new Uint8Array(ADDRESS_ENCODER.encode(address(base58Address)))

/**
 * Builds an account entry for the Solana capability's `remainingAccounts` list.
 *
 * @param publicKey - The account's public key, as 32 raw bytes or a base58 string.
 * @param isWritable - Whether the account is writable. Defaults to false.
 * @returns The account meta.
 */
export const solanaAccountMeta = (
	publicKey: Uint8Array | string,
	isWritable = false,
): SolanaAccountMeta => ({
	publicKey: typeof publicKey === 'string' ? solanaAddressToBytes(publicKey) : publicKey,
	isWritable,
})

/**
 * Converts {@link SolanaAccountMeta} entries to the capability's protobuf
 * JSON `AccountMeta` shape (base64 public keys), as expected by
 * `SolanaClient.writeReport`. Used by generated bindings.
 */
export const solanaAccountMetasToJson = (
	accounts: ReadonlyArray<SolanaAccountMeta>,
): AccountMetaJson[] =>
	accounts.map((account) => ({
		publicKey: bytesToBase64(account.publicKey),
		isWritable: account.isWritable,
	}))

/**
 * Computes the SHA-256 hash of the concatenated public keys of the given
 * accounts, matching the keystone-forwarder's on-chain account hash
 * verification. Nullish entries are skipped; account order matters.
 *
 * Mirrors Go `bindings.CalculateAccountsHash`.
 *
 * @param accounts - The accounts whose public keys are hashed.
 * @returns The 32-byte account hash.
 */
export const calculateAccountsHash = (
	accounts: ReadonlyArray<SolanaAccountInput | null | undefined>,
): Uint8Array => {
	const publicKeys = accounts.filter((acc) => acc != null).map(({ publicKey }) => publicKey)
	return sha256(concatBytes(...publicKeys))
}

export interface ForwarderReport {
	/** The 32-byte hash from `calculateAccountsHash`. */
	accountHash: Uint8Array
	/** The Borsh-encoded report payload the receiver's `on_report` deserializes. */
	payload: Uint8Array
}

/**
 * Borsh-encodes a `ForwarderReport` for the keystone-forwarder:
 * `[32-byte accountHash][u32-LE payload length][payload bytes]`.
 *
 * Mirrors Go `bindings.ForwarderReport.Marshal`.
 *
 * @param report - The account hash and payload to encode.
 * @returns The encoded forwarder report.
 */
export const encodeForwarderReport = (report: ForwarderReport): Uint8Array => {
	if (report.accountHash.length !== ACCOUNT_HASH_LENGTH) {
		throw new Error(
			`encodeForwarderReport: accountHash must be exactly ${ACCOUNT_HASH_LENGTH} bytes, got ${report.accountHash.length}`,
		)
	}
	return concatBytes(report.accountHash, u32LE(report.payload.length), report.payload)
}

/**
 * Returns the Anchor/Borsh encoding of a Vec whose elements are opaque byte
 * payloads: `[u32-LE element count][concatenated element payloads]`.
 * Each element must already be fully serialized for one Vec item on the wire.
 *
 * Mirrors Go's generated `EncodeBorshVecU32`.
 *
 * @param elementPayloads - The pre-encoded Vec elements.
 * @returns The encoded Vec.
 */
export const encodeBorshVecU32 = (elementPayloads: ReadonlyArray<Uint8Array>): Uint8Array =>
	concatBytes(u32LE(elementPayloads.length), ...elementPayloads)

/**
 * Default values expected by the Solana capability for report encoding.
 * Mirrors the constants emitted by the Go Solana bindings generator.
 */
export const SOLANA_DEFAULT_REPORT_ENCODER = {
	encoderName: 'solana',
	signingAlgo: 'ecdsa',
	hashingAlgo: 'keccak256',
} satisfies ReportEncoder

/**
 * Prepares a report request for the Solana capability to pass to `.report()`.
 * Takes raw bytes (typically an encoded `ForwarderReport`), not hex.
 *
 * @param payload - The encoded payload bytes to be signed.
 * @param reportEncoder - The report encoder to use. Defaults to SOLANA_DEFAULT_REPORT_ENCODER.
 * @returns The prepared report request.
 */
export const prepareSolanaReportRequest = (
	payload: Uint8Array,
	reportEncoder: ReportEncoder = SOLANA_DEFAULT_REPORT_ENCODER,
): ReportRequestJson => prepareReportRequestFromBytes(payload, reportEncoder)

const U64_LENGTH = 8
const U64_SIGN_BIT = 1n << 63n
const UTF8_ENCODER = new TextEncoder()

/** Encodes a bigint as a big-endian u64, wrapping modulo 2^64 (two's complement). */
const u64BE = (value: bigint): Uint8Array => {
	const bytes = new Uint8Array(U64_LENGTH)
	new DataView(bytes.buffer).setBigUint64(0, BigInt.asUintN(64, value), false)
	return bytes
}

/**
 * A filter value accepted by {@link prepareSubkeyValue}.
 * Solana public keys must be passed as their 32 raw bytes
 * (see {@link solanaAddressToBytes}), not as base58 strings.
 */
export type SolanaSubkeyValue = Uint8Array | string | bigint | number

/**
 * Encodes a filter value for use in a `SubkeyConfig` `ValueComparator`,
 * matching the byte representation the Solana log-trigger capability indexes.
 *
 * Encodings (mirrors Go `bindings.PrepareSubkeyValue`):
 * - `Uint8Array` — used as-is (public keys, fixed byte arrays, `bytes` fields)
 * - `string` — UTF-8 bytes
 * - `bigint` / integer `number` — 8-byte big-endian two's complement
 *
 * For `f32`/`f64` event fields use {@link prepareSubkeyFloatValue}; passing a
 * non-integer `number` here throws.
 *
 * @param value - The filter value to encode.
 * @returns The encoded comparator value bytes.
 */
export const prepareSubkeyValue = (value: SolanaSubkeyValue): Uint8Array => {
	if (value instanceof Uint8Array) {
		return value
	}
	if (typeof value === 'string') {
		return UTF8_ENCODER.encode(value)
	}
	if (typeof value === 'bigint') {
		return u64BE(value)
	}
	if (typeof value === 'number') {
		if (!Number.isInteger(value)) {
			throw new Error(
				'prepareSubkeyValue: non-integer number; use prepareSubkeyFloatValue for f32/f64 values',
			)
		}
		return u64BE(BigInt(value))
	}
	throw new Error(`prepareSubkeyValue: unsupported subkey value type ${typeof value}`)
}

/**
 * Encodes an `f32`/`f64` filter value into the 8-byte big-endian
 * representation the Solana log-trigger capability indexes.
 *
 * Byte-compatible with Go `bindings.EncodeIndexedValue` for floats: positive
 * values map to `float64bits + 2^63`, others to `2^63 - float64bits`
 * (modulo 2^64). Ordering is preserved among values of the same sign.
 *
 * @param value - The float filter value to encode.
 * @returns The encoded comparator value bytes.
 */
export const prepareSubkeyFloatValue = (value: number): Uint8Array => {
	const view = new DataView(new ArrayBuffer(U64_LENGTH))
	view.setFloat64(0, value, false)
	const bits = view.getBigUint64(0, false)
	return u64BE(value > 0 ? bits + U64_SIGN_BIT : U64_SIGN_BIT - bits)
}

/**
 * A Solana log paired with its decoded event data. Generated log-trigger
 * bindings adapt raw `Log` payloads into this shape.
 *
 * Mirrors Go `bindings.DecodedLog[T]`.
 */
export type SolanaDecodedLog<T> = {
	log: Log
	data: T
}

/** Options for generated Solana log-trigger bindings. */
export interface SolanaLogTriggerOptions {
	/**
	 * Listen for events emitted via Anchor's `emit_cpi!` (self-CPI) instead of
	 * program logs. Sets the trigger's CPI filter to the program's
	 * `anchor:event` method (see {@link anchorCPILogTriggerConfig}).
	 */
	cpi?: boolean
}

/** Method name Anchor uses for `emit_cpi!` self-invocations. */
const ANCHOR_CPI_METHOD_NAME = 'anchor:event'
const ANCHOR_CPI_METHOD_NAME_B64 = bytesToBase64(UTF8_ENCODER.encode(ANCHOR_CPI_METHOD_NAME))

/**
 * Builds the `CPIFilterConfig` for log triggers on events emitted via
 * Anchor's `emit_cpi!`: destination is the program itself, method is
 * `anchor:event`.
 *
 * Mirrors Go `bindings.AnchorCPILogTriggerConfig`.
 *
 * @param programId - The program's public key, as 32 raw bytes or a base58 string.
 * @returns The CPI filter config in protobuf JSON shape.
 */
export const anchorCPILogTriggerConfig = (programId: Uint8Array | string): CPIFilterConfigJson => ({
	destAddress: bytesToBase64(
		typeof programId === 'string' ? solanaAddressToBytes(programId) : programId,
	),
	methodName: ANCHOR_CPI_METHOD_NAME_B64,
})
