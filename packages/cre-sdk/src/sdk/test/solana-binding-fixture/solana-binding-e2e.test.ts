/**
 * End-to-end test of a tool-generated Solana binding against the real SDK:
 * struct codec → forwarder report envelope → report request → capability call,
 * intercepted by SolanaMock/newDataStorageMock. Mirrors the byte expectations
 * of the Go bindings (cre-sdk-go solana bindings common.go).
 */
import { describe, expect } from 'bun:test'
import type { WriteReportRequest } from '@cre/generated/capabilities/blockchain/solana/v1alpha/client_pb'
import { SolanaClient } from '@cre/sdk/cre'
import { newTestRuntime, test } from '@cre/sdk/testutils/test-runtime'
import {
	calculateAccountsHash,
	encodeBorshVecU32,
	encodeForwarderReport,
	solanaAccountMeta,
	solanaAddressToBytes,
} from '@cre/sdk/utils/capabilities/blockchain/solana/solana-helpers'
import { REPORT_METADATA_HEADER_LENGTH } from '../../testutils/test-runtime'
import { SolanaMock } from '../generated'
import { DATA_STORAGE_PROGRAM_ID, DataStorage, type UserData, userDataCodec } from './DataStorage'
import { newDataStorageMock } from './DataStorage_mock'

const CHAIN_SELECTOR = SolanaClient.SUPPORTED_CHAIN_SELECTORS['solana-devnet']

const FORWARDER_STATE = solanaAccountMeta(new Uint8Array(32).fill(1))
const FORWARDER_AUTHORITY = solanaAccountMeta(new Uint8Array(32).fill(2))
const RECEIVER_ACCOUNT = solanaAccountMeta(new Uint8Array(32).fill(3), true)
const REMAINING_ACCOUNTS = [FORWARDER_STATE, FORWARDER_AUTHORITY, RECEIVER_ACCOUNT]

const USER_DATA: UserData = { key: 'k', value: 'v' }

// Borsh: [u32-LE len 'k']['k'][u32-LE len 'v']['v']
const USER_DATA_BORSH = new Uint8Array([1, 0, 0, 0, 0x6b, 1, 0, 0, 0, 0x76])

function setupMock(onRequest: (req: WriteReportRequest) => void) {
	const solanaMock = SolanaMock.testInstance(CHAIN_SELECTOR)
	const dataStorageMock = newDataStorageMock(solanaMock)
	dataStorageMock.writeReport = (input) => {
		onRequest(input as unknown as WriteReportRequest)
		return { txStatus: 'TX_STATUS_SUCCESS' }
	}
	return dataStorageMock
}

describe('generated DataStorage binding E2E', () => {
	test('writeReportFromUserData sends the Go-identical forwarder envelope', () => {
		let received: WriteReportRequest | undefined
		setupMock((req) => {
			received = req
		})

		const runtime = newTestRuntime()
		const binding = new DataStorage(new SolanaClient(CHAIN_SELECTOR))

		const reply = binding.writeReportFromUserData(runtime, USER_DATA, REMAINING_ACCOUNTS)

		expect(reply.txStatus).toBeDefined()
		expect(received).toBeDefined()
		const req = received as WriteReportRequest

		// Receiver is the program ID baked into the IDL.
		expect(req.receiver).toEqual(solanaAddressToBytes(DATA_STORAGE_PROGRAM_ID))

		// remainingAccounts round-trip through the capability JSON layer.
		expect(req.remainingAccounts.map((a) => ({ ...a }))).toMatchObject([
			{ publicKey: FORWARDER_STATE.publicKey, isWritable: false },
			{ publicKey: FORWARDER_AUTHORITY.publicKey, isWritable: false },
			{ publicKey: RECEIVER_ACCOUNT.publicKey, isWritable: true },
		])

		// The struct codec produces the expected bare Borsh bytes.
		expect(new Uint8Array(userDataCodec.encode(USER_DATA))).toEqual(USER_DATA_BORSH)

		// rawReport = test metadata header + ForwarderReport envelope:
		// [32-byte accountHash][u32-LE payload length][payload]
		const rawReport = req.report?.rawReport as Uint8Array
		expect(rawReport).toBeDefined()
		const envelope = rawReport.subarray(REPORT_METADATA_HEADER_LENGTH)
		expect(envelope).toEqual(
			encodeForwarderReport({
				accountHash: calculateAccountsHash(REMAINING_ACCOUNTS),
				payload: USER_DATA_BORSH,
			}),
		)
	})

	test('writeReportFromUserDatas (slice) wraps elements in a Borsh Vec', () => {
		let received: WriteReportRequest | undefined
		setupMock((req) => {
			received = req
		})

		const runtime = newTestRuntime()
		const binding = new DataStorage(new SolanaClient(CHAIN_SELECTOR))

		const second: UserData = { key: 'kk', value: 'vv' }
		binding.writeReportFromUserDatas(runtime, [USER_DATA, second], REMAINING_ACCOUNTS)

		const rawReport = (received as WriteReportRequest).report?.rawReport as Uint8Array
		const envelope = rawReport.subarray(REPORT_METADATA_HEADER_LENGTH)
		expect(envelope).toEqual(
			encodeForwarderReport({
				accountHash: calculateAccountsHash(REMAINING_ACCOUNTS),
				payload: encodeBorshVecU32([
					new Uint8Array(userDataCodec.encode(USER_DATA)),
					new Uint8Array(userDataCodec.encode(second)),
				]),
			}),
		)
	})

	test('computeConfig is forwarded when provided', () => {
		let received: WriteReportRequest | undefined
		setupMock((req) => {
			received = req
		})

		const runtime = newTestRuntime()
		const binding = new DataStorage(new SolanaClient(CHAIN_SELECTOR))

		binding.writeReportFromUserData(runtime, USER_DATA, REMAINING_ACCOUNTS, {
			computeLimit: 200_000,
		})

		expect((received as WriteReportRequest).computeConfig?.computeLimit).toBe(200_000)
	})

	test('writeReport to a different receiver does not hit this program mock', () => {
		setupMock(() => {})

		const runtime = newTestRuntime()
		const otherProgram = '11111111111111111111111111111111'
		const binding = new DataStorage(new SolanaClient(CHAIN_SELECTOR), otherProgram)

		expect(() => binding.writeReportFromUserData(runtime, USER_DATA, REMAINING_ACCOUNTS)).toThrow(
			'no writeReport mock registered for receiver',
		)
	})
})
