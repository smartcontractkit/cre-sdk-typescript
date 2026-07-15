import type {
	AccountMeta,
	ComputeConfig,
	WriteReportReply,
	WriteReportReplyJson,
	WriteReportRequest,
} from '@cre/generated/capabilities/blockchain/solana/v1alpha/client_pb'
import type { ReportResponse } from '@cre/generated/sdk/v1alpha/sdk_pb'
import { solanaAddressToBytes } from '@cre/sdk/utils/capabilities/blockchain/solana/solana-helpers'
import { chainContractHandler } from './contract-mock-core'
import type { SolanaMock } from './generated'

/**
 * Strict version of {@link WriteReportRequest} where `report` is guaranteed
 * to be present. Used by mock handlers so tests don't need to check for
 * undefined.
 */
export interface SolanaWriteReportMockInput {
	receiver: Uint8Array
	report: ReportResponse
	remainingAccounts: AccountMeta[]
	computeConfig?: ComputeConfig
}

/**
 * A program mock returned by {@link addSolanaContractMock}.
 *
 * The Solana CRE capability is write-only, so the only routable handler is
 * `writeReport`. When set, write-report calls targeting this program's ID are
 * routed here; calls for other receivers chain to previously registered mocks.
 */
export interface SolanaContractMock {
	writeReport?: (input: SolanaWriteReportMockInput) => WriteReportReply | WriteReportReplyJson
}

export interface AddSolanaContractMockOptions {
	/** The receiver program ID — base58 string or 32 raw bytes. */
	programId: string | Uint8Array
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
	if (a.length !== b.length) return false
	return a.every((byte, i) => byte === b[i])
}

function describeReceiver(receiver: Uint8Array | undefined): string {
	return receiver ? `0x${Buffer.from(receiver).toString('hex')}` : '(empty)'
}

/**
 * Registers a typed program mock on a {@link SolanaMock} instance.
 *
 * This is the Solana counterpart of {@link addContractMock}: it intercepts
 * `writeReport` on the provided mock, routing calls by receiver program ID.
 * Multiple programs can be mocked on the same `SolanaMock` — each call to
 * `addSolanaContractMock` chains with the previous handler.
 *
 * @example
 * ```ts
 * const solanaMock = SolanaMock.testInstance(chainSelector);
 *
 * const dataStorage = addSolanaContractMock(solanaMock, {
 *   programId: 'ECL8142j2YQAvs9R9geSsRnkVH2wLEi7soJCRyJ74cfL',
 * });
 *
 * dataStorage.writeReport = ({ report, remainingAccounts }) => {
 *   return { txSignature: new Uint8Array(64) };
 * };
 * ```
 *
 * @param solanaMock - The `SolanaMock` instance to attach to.
 * @param options - The receiver program ID to route on.
 * @returns A mock object with a settable `writeReport` handler.
 */
export function addSolanaContractMock(
	solanaMock: SolanaMock,
	options: AddSolanaContractMockOptions,
): SolanaContractMock {
	const mock: SolanaContractMock = {}
	const programIdBytes =
		typeof options.programId === 'string'
			? solanaAddressToBytes(options.programId)
			: options.programId
	const programIdLabel =
		typeof options.programId === 'string' ? options.programId : describeReceiver(options.programId)

	const previousWriteReport = solanaMock.writeReport
	solanaMock.writeReport = chainContractHandler<
		WriteReportRequest,
		WriteReportReply | WriteReportReplyJson
	>({
		previous: previousWriteReport,
		matches: (req) => !!req.receiver && bytesEqual(req.receiver, programIdBytes),
		noMatchError: (req) =>
			`addSolanaContractMock: no writeReport mock registered for receiver ${describeReceiver(req.receiver)}`,
		handle: (req) => {
			if (typeof mock.writeReport !== 'function') {
				throw new Error(`addSolanaContractMock: no writeReport handler set for ${programIdLabel}`)
			}

			if (!req.report) {
				throw new Error(
					`addSolanaContractMock: writeReport called without report for ${programIdLabel}`,
				)
			}

			return mock.writeReport({
				receiver: req.receiver,
				report: req.report,
				remainingAccounts: req.remainingAccounts,
				computeConfig: req.computeConfig,
			})
		},
	})

	return mock
}
