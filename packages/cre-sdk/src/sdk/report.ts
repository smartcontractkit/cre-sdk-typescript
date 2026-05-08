import { create, fromJson } from '@bufbuild/protobuf'
import { BinaryReader, WireType } from '@bufbuild/protobuf/wire'
import { AnySchema } from '@bufbuild/protobuf/wkt'
import {
	AttributedSignatureSchema,
	AwaitCapabilitiesRequestSchema,
	CapabilityRequestSchema,
	type ReportResponse,
	type ReportResponseJson,
	ReportResponseSchema,
} from '@cre/generated/sdk/v1alpha/sdk_pb'
import type { Address } from 'viem'
import { concatHex, getAddress, hexToBytes, keccak256, recoverAddress, toHex } from 'viem'
import { type Environment, productionEnvironment, type Zone } from './don-info'
import {
	DuplicateSignerError,
	NullReportError,
	ParseSignatureError,
	RawReportTooShortError,
	RecoverSignerError,
	UnknownSignerError,
	WrongSignatureCountError,
} from './errors'
import { type DonInfo, donInfoCache } from './report-internals'
import type { BaseRuntime } from './runtime'

const GET_DON_SELECTOR = new Uint8Array([0x23, 0x53, 0x74, 0x05])
const GET_NODES_BY_P2P_IDS_SELECTOR = new Uint8Array([0x05, 0xa5, 0x19, 0x66])

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

function padUint256(v: bigint | number): Uint8Array {
	const n = typeof v === 'bigint' ? v : BigInt(v)
	const b = new Uint8Array(32)
	const view = new DataView(b.buffer)
	view.setBigUint64(24, n, false)
	return b
}

function bytesToBigIntBE(word: Uint8Array): bigint {
	let x = 0n
	for (let i = 0; i < word.length; i++) {
		x = (x << 8n) | BigInt(word[i])
	}
	return x
}

function readUint256AsInt(word: Uint8Array): number {
	const b = bytesToBigIntBE(word)
	if (b > BigInt(Number.MAX_SAFE_INTEGER)) {
		throw new Error('ABI uint256 value too large for Number')
	}
	return Number(b)
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

function encodeGetDONCalldata(donID: number): Uint8Array {
	const padded = new Uint8Array(32)
	const view = new DataView(padded.buffer)
	view.setUint32(28, donID >>> 0, false)
	const out = new Uint8Array(4 + 32)
	out.set(GET_DON_SELECTOR, 0)
	out.set(padded, 4)
	return out
}

function concatBytes(parts: readonly Uint8Array[]): Uint8Array {
	const total = parts.reduce((n, p) => n + p.length, 0)
	const r = new Uint8Array(total)
	let o = 0
	for (const p of parts) {
		r.set(p, o)
		o += p.length
	}
	return r
}

function encodeGetNodesByP2PIdsCalldata(p2pIds: Uint8Array[]): Uint8Array {
	const chunks: Uint8Array[] = [
		GET_NODES_BY_P2P_IDS_SELECTOR,
		padUint256(32),
		padUint256(p2pIds.length),
	]
	for (const id of p2pIds) {
		if (id.length !== 32) {
			throw new Error('p2p id must be 32 bytes')
		}
		chunks.push(new Uint8Array(id))
	}
	return concatBytes(chunks)
}

const NODE_TUPLE_HEAD_SIZE = 288

function fetchDONInfo(runtime: BaseRuntime<unknown>, env: Environment, donID: number): DonInfo {
	const key = cacheKey(env, donID)
	const hit = donInfoCache.get(key)
	if (hit) {
		return hit
	}

	const registryAddr = decodeRegistryAddress(env.registryAddress)
	const capID = `evm:ChainSelector:${env.chainSelector.toString()}@1.0.0`

	const getDONABI = callContract(runtime, capID, registryAddr, encodeGetDONCalldata(donID))

	if (getDONABI.length < 224) {
		throw new Error(`getDON ABI response too short: ${getDONABI.length} bytes`)
	}

	const f = readUint256AsInt(getDONABI.subarray(96, 128))

	const tupleStart = 32
	const nodeP2PIdsPtr = readUint256AsInt(getDONABI.subarray(192, 224))
	const nodeCountOff = tupleStart + nodeP2PIdsPtr
	if (nodeCountOff + 32 > getDONABI.length) {
		throw new Error('getDON ABI: nodeP2PIds pointer out of range')
	}
	const nodeCount = readUint256AsInt(getDONABI.subarray(nodeCountOff, nodeCountOff + 32))
	if (nodeCountOff + 32 + nodeCount * 32 > getDONABI.length) {
		throw new Error('getDON ABI: nodeP2PIds data out of range')
	}

	const nodeP2PIds: Uint8Array[] = []
	for (let i = 0; i < nodeCount; i++) {
		const start = nodeCountOff + 32 + i * 32
		nodeP2PIds.push(getDONABI.subarray(start, start + 32))
	}

	if (nodeCount === 0) {
		const info: DonInfo = { f, signers: new Map() }
		donInfoCache.set(key, info)
		return info
	}

	const getNodesABI = callContract(
		runtime,
		capID,
		registryAddr,
		encodeGetNodesByP2PIdsCalldata(nodeP2PIds),
	)

	if (getNodesABI.length < 64) {
		throw new Error(`getNodesByP2PIds ABI response too short: ${getNodesABI.length} bytes`)
	}

	const outerPtr = readUint256AsInt(getNodesABI.subarray(0, 32))
	if (outerPtr + 32 > getNodesABI.length) {
		throw new Error('getNodesByP2PIds ABI: outer pointer out of range')
	}
	const returnedCount = readUint256AsInt(getNodesABI.subarray(outerPtr, outerPtr + 32))

	const signers = new Map<Address, number>()
	for (let i = 0; i < returnedCount; i++) {
		const elemPtrOff = outerPtr + 32 + i * 32
		if (elemPtrOff + 32 > getNodesABI.length) {
			break
		}
		const elemPtr = readUint256AsInt(getNodesABI.subarray(elemPtrOff, elemPtrOff + 32))
		const tupleBase = outerPtr + 32 + elemPtr
		if (tupleBase + NODE_TUPLE_HEAD_SIZE > getNodesABI.length) {
			break
		}
		const nodeOperatorId = Number(
			bytesToBigIntBE(getNodesABI.subarray(tupleBase, tupleBase + 32)) & 0xffffffffn,
		)
		const signerSlot = tupleBase + 3 * 32
		const addrBytes = getNodesABI.subarray(signerSlot, signerSlot + 20)
		const addr = getAddress(toHex(addrBytes))
		signers.set(addr, nodeOperatorId)
	}

	const info: DonInfo = { f, signers }
	donInfoCache.set(key, info)
	return info
}

function computeReportHash(rawReport: Uint8Array, reportContext: Uint8Array): `0x${string}` {
	const innerHash = keccak256(toHex(rawReport))
	return keccak256(concatHex([innerHash, toHex(reportContext)]))
}

function addressKeyNo0x(addr: `0x${string}`): string {
	return addr.slice(2).toLowerCase()
}

async function verifySigs(
	report: ReportResponse,
	f: number,
	signers: Map<string, number>,
): Promise<void> {
	const required = f + 1
	const sigs = report.sigs
	if (sigs.length < required) {
		throw new WrongSignatureCountError()
	}

	const reportHash = computeReportHash(report.rawReport, report.reportContext)
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
}

function mergeReportParseConfig(
	overrides?: ReportParseConfig,
): Required<
	Pick<ReportParseConfig, 'acceptedZones' | 'acceptedEnvironments' | 'skipSignatureVerification'>
> {
	return {
		acceptedZones: overrides?.acceptedZones ?? [],
		acceptedEnvironments:
			overrides !== undefined ? (overrides.acceptedEnvironments ?? []) : [productionEnvironment()],
		skipSignatureVerification: overrides?.skipSignatureVerification ?? false,
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
				'acceptedZones' | 'acceptedEnvironments' | 'skipSignatureVerification'
			>
		>,
	): Promise<void> {
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

			try {
				await verifySigs(this.report, info.f, normalizeDonSigners(info.signers))
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
