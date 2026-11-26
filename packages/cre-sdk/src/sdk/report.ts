import { create, fromBinary, fromJson } from '@bufbuild/protobuf'
import { BinaryReader, WireType } from '@bufbuild/protobuf/wire'
import { AnySchema } from '@bufbuild/protobuf/wkt'
import {
	type CapabilityConfig,
	CapabilityConfigSchema,
} from '@cre/generated/internal/cre_sdk_registry_pb'
import {
	AttributedSignatureSchema,
	AwaitCapabilitiesRequestSchema,
	CapabilityRequestSchema,
	type ReportResponse,
	type ReportResponseJson,
	ReportResponseSchema,
} from '@cre/generated/sdk/v1alpha/sdk_pb'
import type { Address, Hex } from 'viem'
import {
	concatHex,
	decodeFunctionResult,
	encodeFunctionData,
	getAddress,
	hexToBytes,
	keccak256,
	recoverAddress,
	sha256,
	slice,
	toHex,
} from 'viem'
import { capabilitiesRegistryAbi } from './capabilities-registry-abi'
import { type Environment, productionEnvironment, type Zone } from './don-info'
import {
	DuplicateSignerError,
	NullReportError,
	ParseSignatureError,
	RawReportTooShortError,
	RecoverSignerError,
	UnknownSignerError,
	UnsupportedEncoderError,
	WrongSignatureCountError,
} from './errors'
import { type DonInfo, donInfoCache } from './report-internals'
import type { BaseRuntime } from './runtime'

function cacheKey(env: Environment, donID: number): string {
	return `${env.chainSelector.toString()}:${donID}`
}

function normalizeRegistryHex(addr: string): string {
	return addr
		.trim()
		.replace(/^0[xX]/, '')
		.toLowerCase()
}

function isProductionEnvironmentForReport(env: Environment): boolean {
	const pe = productionEnvironment()
	return (
		env.chainSelector === pe.chainSelector &&
		normalizeRegistryHex(env.registryAddress) === normalizeRegistryHex(pe.registryAddress)
	)
}

function decodeRegistryAddress(registryAddress: string): Uint8Array {
	const hex = normalizeRegistryHex(registryAddress)
	if (hex.length !== 40) {
		throw new Error(`invalid registry address ${JSON.stringify(registryAddress)}`)
	}
	return hexToBytes(`0x${hex}`)
}

function protoVarint(v: number | bigint): number[] {
	const out: number[] = []
	let n = typeof v === 'bigint' ? v : BigInt(v)
	while (n >= 128n) {
		out.push(Number(n & 0x7fn) | 0x80)
		n >>= 7n
	}
	out.push(Number(n))
	return out
}

function protoTag(field: number, wireType: 0 | 2): number[] {
	return protoVarint((field << 3) | wireType)
}

function protoLenBytes(data: Uint8Array): number[] {
	return [...protoVarint(data.length), ...data]
}

function buildCallContractRequestBytes(registryAddr: Uint8Array, callData: Uint8Array): Uint8Array {
	const callMsg = new Uint8Array([
		...protoTag(2, 2),
		...protoLenBytes(registryAddr),
		...protoTag(3, 2),
		...protoLenBytes(callData),
	])
	const bigInt = new Uint8Array([
		...protoTag(1, 2),
		...protoLenBytes(new Uint8Array([0x03])),
		...protoTag(2, 0),
		...protoVarint(0xffffffffffffffffn),
	])
	return new Uint8Array([
		...protoTag(2, 2),
		...protoLenBytes(bigInt),
		...protoTag(1, 2),
		...protoLenBytes(callMsg),
	])
}

function decodeCallContractReplyData(bytes: Uint8Array): Uint8Array {
	const reader = new BinaryReader(bytes)
	while (reader.pos < reader.len) {
		const [fieldNo, wireType] = reader.tag()
		if (fieldNo === 1 && wireType === WireType.LengthDelimited) {
			return reader.bytes()
		}
		reader.skip(wireType)
	}
	throw new Error('data field not found in CallContractReply')
}

const CALL_CONTRACT_REQUEST_TYPE_URL =
	'type.googleapis.com/capabilities.blockchain.evm.v1alpha.CallContractRequest'

function callContract(
	runtime: BaseRuntime<unknown>,
	capID: string,
	registryAddr: Uint8Array,
	callData: Uint8Array,
): Uint8Array {
	const reqBytes = buildCallContractRequestBytes(registryAddr, callData)
	const anyPayload = create(AnySchema, {
		typeUrl: CALL_CONTRACT_REQUEST_TYPE_URL,
		value: reqBytes,
	})
	// biome-ignore lint/suspicious/noExplicitAny: intentional bypass of typed callCapability to avoid EVM schema imports
	const rt = runtime as any
	const callbackId: number = rt.nextCallId++
	const req = create(CapabilityRequestSchema, {
		id: capID,
		method: 'CallContract',
		payload: anyPayload,
		callbackId,
	})

	if (!rt.helpers.call(req)) {
		throw new Error(`EVM capability '${capID}' not found`)
	}

	// Must use create() — the real WASM bridge serializes this as a protobuf message and
	// requires a proper typed message (with $typeName). A plain { ids: [...] } object works
	// in the test runtime but silently breaks in simulation.
	const awaitResp = rt.helpers.await(
		create(AwaitCapabilitiesRequestSchema, { ids: [callbackId] }),
		rt.maxResponseSize,
	)
	const capResp = awaitResp?.responses?.[callbackId]
	if (!capResp) {
		throw new Error(`no response from EVM capability '${capID}'`)
	}
	const response = capResp.response
	if (response.case === 'error') {
		throw new Error(response.value as string)
	}
	if (response.case !== 'payload') {
		throw new Error(`unexpected response '${response.case}' from EVM capability '${capID}'`)
	}
	return decodeCallContractReplyData((response.value as { value: Uint8Array }).value)
}

// callRegistry sends ABI-encoded call data to the capabilities registry via the EVM capability
// and returns the ABI-encoded result.
function callRegistry(
	runtime: BaseRuntime<unknown>,
	capID: string,
	registryAddr: Uint8Array,
	callData: Hex,
): Hex {
	return toHex(callContract(runtime, capID, registryAddr, hexToBytes(callData)))
}

function fetchDONInfo(runtime: BaseRuntime<unknown>, env: Environment, donID: number): DonInfo {
	const key = cacheKey(env, donID)
	const hit = donInfoCache.get(key)
	if (hit) {
		return hit
	}

	const registryAddr = decodeRegistryAddress(env.registryAddress)
	const capID = `evm:ChainSelector:${env.chainSelector.toString()}@1.0.0`

	const don = decodeFunctionResult({
		abi: capabilitiesRegistryAbi,
		functionName: 'getDON',
		data: callRegistry(
			runtime,
			capID,
			registryAddr,
			encodeFunctionData({ abi: capabilitiesRegistryAbi, functionName: 'getDON', args: [donID] }),
		),
	})
	const f = don.f

	if (don.nodeP2PIds.length === 0) {
		const info: DonInfo = { f, signers: new Map() }
		donInfoCache.set(key, info)
		return info
	}

	const nodes = decodeFunctionResult({
		abi: capabilitiesRegistryAbi,
		functionName: 'getNodesByP2PIds',
		data: callRegistry(
			runtime,
			capID,
			registryAddr,
			encodeFunctionData({
				abi: capabilitiesRegistryAbi,
				functionName: 'getNodesByP2PIds',
				args: [don.nodeP2PIds],
			}),
		),
	})

	const signers = new Map<Address, number>()
	for (const node of nodes) {
		// The signer is an address left-aligned in a bytes32.
		signers.set(getAddress(slice(node.signer, 0, 20)), node.nodeOperatorId)
	}

	const info: DonInfo = { f, signers }
	try {
		info.solanaSigners = solanaSignersFromDON(don.capabilityConfigurations, signers)
	} catch (err) {
		info.solanaSignersError = err instanceof Error ? err : new Error(String(err))
	}
	donInfoCache.set(key, info)
	return info
}

// signersFor returns the authorized signers for reports produced by the given encoder.
function signersFor(info: DonInfo, encoder: ReportEncoder): Map<Address, number> {
	if (encoder !== SOLANA_REPORT_ENCODER) {
		return info.signers
	}
	if (info.solanaSignersError !== undefined) {
		throw info.solanaSignersError
	}
	return info.solanaSigners ?? new Map()
}

// CONSENSUS_CAPABILITY_PREFIX identifies the consensus capability in a DON's capabilityConfigurations.
const CONSENSUS_CAPABILITY_PREFIX = 'consensus@'
// DEFAULT_OCR3_CONFIG_KEY is the OCR instance name used by single-instance capabilities.
const DEFAULT_OCR3_CONFIG_KEY = '__default__'
// Chain type identifiers used in multichain onchain public keys (see corekeys.ChainType.Type).
const CHAIN_TYPE_EVM = 1
const CHAIN_TYPE_SOLANA = 2

type CapabilityConfiguration = { capabilityId: string; config: Hex }

// solanaSignersFromDON maps each Solana signer in the consensus capability's OCR3 config to its node operator.
// Every OCR3 signer is a multichain key containing the node's EVM and Solana keys; the EVM key is matched against
// the registry's node signers so that only signers belonging to the DON's nodes are accepted.
function solanaSignersFromDON(
	capabilityConfigurations: readonly CapabilityConfiguration[],
	evmSigners: Map<Address, number>,
): Map<Address, number> {
	const solanaSigners = new Map<Address, number>()
	for (const ocrSigner of consensusOCR3Signers(capabilityConfigurations)) {
		const keys = parseMultichainPublicKey(ocrSigner)
		const evmKey = keys.get(CHAIN_TYPE_EVM)
		const solanaKey = keys.get(CHAIN_TYPE_SOLANA)
		if (evmKey?.length !== 20 || solanaKey?.length !== 20) {
			continue
		}

		const nodeOperatorId = evmSigners.get(getAddress(toHex(evmKey)))
		if (nodeOperatorId === undefined) {
			continue
		}
		solanaSigners.set(getAddress(toHex(solanaKey)), nodeOperatorId)
	}

	if (solanaSigners.size === 0) {
		throw new Error('consensus OCR3 config has no solana signers')
	}
	return solanaSigners
}

// consensusOCR3Signers returns the signers of the consensus capability's default OCR3 config.
function consensusOCR3Signers(
	capabilityConfigurations: readonly CapabilityConfiguration[],
): Uint8Array[] {
	const consensus = capabilityConfigurations.find((c) =>
		c.capabilityId.startsWith(CONSENSUS_CAPABILITY_PREFIX),
	)
	if (consensus === undefined) {
		throw new Error('consensus capability is not configured on the DON')
	}

	let config: CapabilityConfig
	try {
		config = fromBinary(CapabilityConfigSchema, hexToBytes(consensus.config))
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err)
		throw new Error(`malformed consensus capability config: ${msg}`)
	}

	const ocr3Config = config.ocr3Configs[DEFAULT_OCR3_CONFIG_KEY]
	if (ocr3Config === undefined) {
		throw new Error(`consensus capability config has no "${DEFAULT_OCR3_CONFIG_KEY}" OCR3 config`)
	}
	return ocr3Config.signers
}

// parseMultichainPublicKey splits an OCR3 multichain onchain public key into its per-chain keys.
// Encoding: repeated [chainType uint8][length uint16 little-endian][key].
function parseMultichainPublicKey(data: Uint8Array): Map<number, Uint8Array> {
	const keys = new Map<number, Uint8Array>()
	let offset = 0
	while (offset < data.length) {
		if (data.length - offset < 3) {
			throw new Error('malformed multichain public key: truncated header')
		}
		const chainType = data[offset]
		const length = data[offset + 1] | (data[offset + 2] << 8)
		const start = offset + 3
		if (data.length - start < length) {
			throw new Error('malformed multichain public key: truncated key')
		}
		keys.set(chainType, data.subarray(start, start + length))
		offset = start + length
	}
	return keys
}

function computeReportHash(rawReport: Uint8Array, reportContext: Uint8Array): `0x${string}` {
	const innerHash = keccak256(toHex(rawReport))
	return keccak256(concatHex([innerHash, toHex(reportContext)]))
}

// solanaReportHash matches the Solana keyring and forwarder program:
// sha256(uint8(len(rawReport)) || rawReport || reportContext). The length prefix is a single, truncated byte.
function solanaReportHash(rawReport: Uint8Array, reportContext: Uint8Array): `0x${string}` {
	return sha256(
		concatHex([
			toHex(rawReport.length & 0xff, { size: 1 }),
			toHex(rawReport),
			toHex(reportContext),
		]),
	)
}

// hashReport returns the digest the encoder's key bundle signs.
function hashReport(encoder: ReportEncoder, report: ReportResponse): `0x${string}` {
	if (encoder === SOLANA_REPORT_ENCODER) {
		return solanaReportHash(report.rawReport, report.reportContext)
	}
	return computeReportHash(report.rawReport, report.reportContext)
}

function addressKeyNo0x(addr: `0x${string}`): string {
	return addr.slice(2).toLowerCase()
}

async function verifySigs(
	report: ReportResponse,
	f: number,
	signers: Map<string, number>,
	reportHash: `0x${string}`,
): Promise<void> {
	const required = f + 1
	const sigs = report.sigs
	if (sigs.length < required) {
		throw new WrongSignatureCountError()
	}

	const seen = new Set<string>()
	const accepted: typeof sigs = []
	const skipErrs: Error[] = []

	for (let i = 0; i < sigs.length; i++) {
		if (accepted.length === required) {
			break
		}

		const attrSig = sigs[i]
		const sigBytes = new Uint8Array(attrSig.signature)

		if (sigBytes.length !== 65) {
			skipErrs.push(new ParseSignatureError())
			continue
		}

		const normalized = new Uint8Array(sigBytes)
		if (normalized[64] === 27 || normalized[64] === 28) {
			normalized[64] -= 27
		}

		let recovered: `0x${string}`
		try {
			recovered = await recoverAddress({
				hash: reportHash,
				signature: toHex(normalized),
			})
		} catch {
			skipErrs.push(new RecoverSignerError())
			continue
		}

		const key = addressKeyNo0x(recovered)
		if (seen.has(key)) {
			skipErrs.push(new DuplicateSignerError())
			continue
		}
		seen.add(key)

		const nodeOperatorId = signers.get(key)
		if (nodeOperatorId === undefined) {
			skipErrs.push(new UnknownSignerError())
			continue
		}

		attrSig.signerId = nodeOperatorId
		accepted.push(attrSig)
	}

	if (accepted.length < required) {
		if (skipErrs.length > 0) {
			throw new AggregateError(skipErrs)
		}
		throw new WrongSignatureCountError()
	}

	report.sigs = accepted
}

export type ReportParseConfig = {
	acceptedZones?: Zone[]
	acceptedEnvironments?: Environment[]
	skipSignatureVerification?: boolean
	/**
	 * Encoder name the report was generated with (`ReportRequest.encoderName`).
	 * Defaults to `"evm"`. Only `"evm"` and `"solana"` reports can currently be parsed and verified;
	 * any other value throws `UnsupportedEncoderError`.
	 */
	encoder?: string
}

/** Encoder name for reports signed with the EVM (ECDSA secp256k1) key bundle. */
export const EVM_REPORT_ENCODER = 'evm'
/** Encoder name for reports signed with the Solana (ECDSA secp256k1) key bundle. */
export const SOLANA_REPORT_ENCODER = 'solana'

type ReportEncoder = typeof EVM_REPORT_ENCODER | typeof SOLANA_REPORT_ENCODER

// resolveEncoder returns the normalized encoder name, defaulting to EVM_REPORT_ENCODER.
function resolveEncoder(encoder: string | undefined): ReportEncoder {
	switch (encoder?.toLowerCase()) {
		case undefined:
		case '':
		case EVM_REPORT_ENCODER:
			return EVM_REPORT_ENCODER
		case SOLANA_REPORT_ENCODER:
			return SOLANA_REPORT_ENCODER
		default:
			throw new UnsupportedEncoderError(encoder as string)
	}
}

function mergeReportParseConfig(
	overrides?: ReportParseConfig,
): Required<
	Pick<
		ReportParseConfig,
		'acceptedZones' | 'acceptedEnvironments' | 'skipSignatureVerification' | 'encoder'
	>
> {
	return {
		acceptedZones: overrides?.acceptedZones ?? [],
		acceptedEnvironments:
			overrides !== undefined ? (overrides.acceptedEnvironments ?? []) : [productionEnvironment()],
		skipSignatureVerification: overrides?.skipSignatureVerification ?? false,
		encoder: resolveEncoder(overrides?.encoder),
	}
}

function normalizeDonSigners(signers: Map<Address, number>): Map<string, number> {
	const out = new Map<string, number>()
	for (const [addr, id] of signers) {
		out.set(addr.slice(2).toLowerCase(), id)
	}
	return out
}

export const REPORT_METADATA_HEADER_LENGTH = 109

const REPORT_METADATA_OFFSETS = {
	version: 0,
	versionSize: 1,
	executionId: 1,
	executionIdSize: 32,
	timestamp: 33,
	timestampSize: 4,
	donId: 37,
	donIdSize: 4,
	donConfigVersion: 41,
	donConfigVersionSize: 4,
	workflowId: 45,
	workflowIdSize: 32,
	workflowName: 77,
	workflowNameSize: 10,
	workflowOwner: 87,
	workflowOwnerSize: 20,
	reportId: 107,
	reportIdSize: 2,
	bodyStart: 109,
} as const

export type ReportMetadataHeader = {
	version: number
	executionId: string
	timestamp: number
	donId: number
	donConfigVersion: number
	workflowId: string
	workflowName: string
	workflowOwner: string
	reportId: string
	body: Uint8Array
}

function encodeHexLower(bytes: Uint8Array): string {
	let out = ''
	for (let i = 0; i < bytes.length; i++) {
		out += bytes[i].toString(16).padStart(2, '0')
	}
	return out
}

function readUint32BE(raw: Uint8Array, offset: number): number {
	return new DataView(raw.buffer, raw.byteOffset + offset, 4).getUint32(0, false)
}

function parseReportMetadataHeader(raw: Uint8Array | null | undefined): ReportMetadataHeader {
	if (raw === undefined || raw === null) {
		throw new NullReportError()
	}
	if (raw.length < REPORT_METADATA_HEADER_LENGTH) {
		throw new RawReportTooShortError(REPORT_METADATA_HEADER_LENGTH, raw.length)
	}

	const o = REPORT_METADATA_OFFSETS
	const workflowNameBytes = raw.subarray(o.workflowName, o.workflowName + o.workflowNameSize)

	return {
		version: raw[o.version],
		executionId: encodeHexLower(raw.subarray(o.executionId, o.executionId + o.executionIdSize)),
		timestamp: readUint32BE(raw, o.timestamp),
		donId: readUint32BE(raw, o.donId),
		donConfigVersion: readUint32BE(raw, o.donConfigVersion),
		workflowId: encodeHexLower(raw.subarray(o.workflowId, o.workflowId + o.workflowIdSize)),
		workflowName: new TextDecoder('utf-8', { fatal: false }).decode(workflowNameBytes),
		workflowOwner: encodeHexLower(
			raw.subarray(o.workflowOwner, o.workflowOwner + o.workflowOwnerSize),
		),
		reportId: encodeHexLower(raw.subarray(o.reportId, o.reportId + o.reportIdSize)),
		body: raw.subarray(REPORT_METADATA_HEADER_LENGTH),
	}
}

export class Report {
	private readonly report: ReportResponse
	private cachedHeader: ReportMetadataHeader | undefined

	public constructor(report: ReportResponse | ReportResponseJson) {
		this.report = (report as unknown as { $typeName?: string }).$typeName
			? (report as ReportResponse)
			: fromJson(ReportResponseSchema, report as ReportResponseJson)
	}

	public static async parse(
		runtime: BaseRuntime<unknown>,
		rawReport: Uint8Array,
		signatures: Uint8Array[],
		reportContext: Uint8Array,
		config?: ReportParseConfig,
	): Promise<Report> {
		resolveEncoder(config?.encoder)

		const configDigest =
			reportContext.length >= 32 ? reportContext.slice(0, 32) : new Uint8Array(32)
		const seqNr =
			reportContext.length >= 40
				? new DataView(reportContext.buffer, reportContext.byteOffset + 32, 8).getBigUint64(
						0,
						false,
					)
				: 0n
		const reportResponse = create(ReportResponseSchema, {
			configDigest,
			seqNr,
			reportContext,
			rawReport,
			sigs: signatures.map((signature) =>
				create(AttributedSignatureSchema, { signature, signerId: 0 }),
			),
		})

		const merged = mergeReportParseConfig(config)
		const report = new Report(reportResponse)
		if (merged.skipSignatureVerification) {
			report.donId()
			return report
		}
		await report.verifySignaturesWithConfig(runtime, merged)
		return report
	}

	private parseHeader(): ReportMetadataHeader {
		if (this.cachedHeader !== undefined) {
			return this.cachedHeader
		}
		this.cachedHeader = parseReportMetadataHeader(this.report.rawReport)
		return this.cachedHeader
	}

	private async verifySignaturesWithConfig(
		runtime: BaseRuntime<unknown>,
		config: Required<
			Pick<
				ReportParseConfig,
				'acceptedZones' | 'acceptedEnvironments' | 'skipSignatureVerification' | 'encoder'
			>
		>,
	): Promise<void> {
		const encoder = resolveEncoder(config.encoder)
		const donId = this.donId()
		const candidates: Environment[] = []
		for (const z of config.acceptedZones) {
			if (z.donID === donId) {
				candidates.push(z.environment)
			}
		}
		candidates.push(...config.acceptedEnvironments)

		if (candidates.length === 0) {
			throw new Error(`DON ID ${donId} is not in accepted zones`)
		}

		const reportHash = hashReport(encoder, this.report)
		const fetchFailures: Error[] = []
		let lastVerifyErr: Error | null = null

		for (const env of candidates) {
			let info: DonInfo
			try {
				info = fetchDONInfo(runtime, env, donId)
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err)
				fetchFailures.push(
					new Error(
						`could not read from chain ${env.chainSelector} contract ${env.registryAddress}: ${msg}`,
					),
				)
				continue
			}

			let signers: Map<Address, number>
			try {
				signers = signersFor(info, encoder)
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err)
				fetchFailures.push(
					new Error(
						`no ${encoder} signers for DON ${donId} on chain ${env.chainSelector} contract ${env.registryAddress}: ${msg}`,
					),
				)
				continue
			}

			try {
				await verifySigs(this.report, info.f, normalizeDonSigners(signers), reportHash)
				return
			} catch (err) {
				lastVerifyErr = err instanceof Error ? err : new Error(String(err))
			}
		}

		if (fetchFailures.length > 0) {
			throw new AggregateError(fetchFailures, fetchFailures.map((e) => e.message).join('\n'))
		}
		if (lastVerifyErr !== null) {
			throw lastVerifyErr
		}
	}

	public seqNr(): bigint {
		return this.report.seqNr
	}

	public configDigest(): Uint8Array {
		return this.report.configDigest
	}

	public reportContext(): Uint8Array {
		return this.report.reportContext
	}

	public rawReport(): Uint8Array {
		return this.report.rawReport
	}

	public version(): number {
		return this.parseHeader().version
	}

	public executionId(): string {
		return this.parseHeader().executionId
	}

	public timestamp(): number {
		return this.parseHeader().timestamp
	}

	public donId(): number {
		return this.parseHeader().donId
	}

	public donConfigVersion(): number {
		return this.parseHeader().donConfigVersion
	}

	public workflowId(): string {
		return this.parseHeader().workflowId
	}

	public workflowName(): string {
		return this.parseHeader().workflowName
	}

	public workflowOwner(): string {
		return this.parseHeader().workflowOwner
	}

	public reportId(): string {
		return this.parseHeader().reportId
	}

	public body(): Uint8Array {
		return this.parseHeader().body
	}

	// x_generatedCodeOnly_unwrap is meant to be used by the code generator only.
	x_generatedCodeOnly_unwrap(): ReportResponse {
		return this.report
	}
}
