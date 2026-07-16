import { describe, expect } from 'bun:test'
import type { WriteReportRequest } from '@cre/generated/capabilities/blockchain/solana/v1alpha/client_pb'
import type { ReportResponse } from '@cre/generated/sdk/v1alpha/sdk_pb'
import { solanaAddressToBytes } from '@cre/sdk/utils/capabilities/blockchain/solana/solana-helpers'
import { test } from '../testutils/test-runtime'
import { SolanaMock } from './generated'
import { addSolanaContractMock } from './solana-contract-mock'

const PROGRAM_A = 'ECL8142j2YQAvs9R9geSsRnkVH2wLEi7soJCRyJ74cfL'
const PROGRAM_B = '11111111111111111111111111111111'
const CHAIN_SELECTOR = 16423721717087811551n // solana-devnet

function makeWriteReportRequest(programId: string, withReport = true): WriteReportRequest {
	return {
		$typeName: 'capabilities.blockchain.solana.v1alpha.WriteReportRequest',
		receiver: solanaAddressToBytes(programId),
		remainingAccounts: [],
		...(withReport ? { report: { rawReport: new Uint8Array([1, 2, 3]) } as ReportResponse } : {}),
	} as unknown as WriteReportRequest
}

describe('addSolanaContractMock', () => {
	test('routes writeReport by receiver program ID', () => {
		const solanaMock = SolanaMock.testInstance(CHAIN_SELECTOR)

		const mock = addSolanaContractMock(solanaMock, { programId: PROGRAM_A })
		let seenReceiver: Uint8Array | undefined
		mock.writeReport = ({ receiver }) => {
			seenReceiver = receiver
			return { txStatus: 'TX_STATUS_SUCCESS' }
		}

		const reply = solanaMock.writeReport?.(makeWriteReportRequest(PROGRAM_A))

		expect(reply).toEqual({ txStatus: 'TX_STATUS_SUCCESS' })
		expect(seenReceiver).toEqual(solanaAddressToBytes(PROGRAM_A))
	})

	test('chains multiple program mocks on the same SolanaMock', () => {
		const solanaMock = SolanaMock.testInstance(CHAIN_SELECTOR)

		const mockA = addSolanaContractMock(solanaMock, { programId: PROGRAM_A })
		const mockB = addSolanaContractMock(solanaMock, { programId: PROGRAM_B })

		mockA.writeReport = () => ({ txStatus: 'TX_STATUS_SUCCESS' })
		mockB.writeReport = () => ({ txStatus: 'TX_STATUS_ABORTED' })

		expect(solanaMock.writeReport?.(makeWriteReportRequest(PROGRAM_A))).toEqual({
			txStatus: 'TX_STATUS_SUCCESS',
		})
		expect(solanaMock.writeReport?.(makeWriteReportRequest(PROGRAM_B))).toEqual({
			txStatus: 'TX_STATUS_ABORTED',
		})
	})

	test('throws for an unregistered receiver', () => {
		const solanaMock = SolanaMock.testInstance(CHAIN_SELECTOR)

		const mock = addSolanaContractMock(solanaMock, { programId: PROGRAM_A })
		mock.writeReport = () => ({ txStatus: 'TX_STATUS_SUCCESS' })

		expect(() => solanaMock.writeReport?.(makeWriteReportRequest(PROGRAM_B))).toThrow(
			'no writeReport mock registered for receiver',
		)
	})

	test('throws when no handler is set on the program mock', () => {
		const solanaMock = SolanaMock.testInstance(CHAIN_SELECTOR)

		addSolanaContractMock(solanaMock, { programId: PROGRAM_A })

		expect(() => solanaMock.writeReport?.(makeWriteReportRequest(PROGRAM_A))).toThrow(
			`no writeReport handler set for ${PROGRAM_A}`,
		)
	})

	test('throws when the request has no report', () => {
		const solanaMock = SolanaMock.testInstance(CHAIN_SELECTOR)

		const mock = addSolanaContractMock(solanaMock, { programId: PROGRAM_A })
		mock.writeReport = () => ({ txStatus: 'TX_STATUS_SUCCESS' })

		expect(() => solanaMock.writeReport?.(makeWriteReportRequest(PROGRAM_A, false))).toThrow(
			'writeReport called without report',
		)
	})

	test('accepts a raw 32-byte program ID', () => {
		const solanaMock = SolanaMock.testInstance(CHAIN_SELECTOR)

		const mock = addSolanaContractMock(solanaMock, {
			programId: solanaAddressToBytes(PROGRAM_A),
		})
		mock.writeReport = () => ({ txStatus: 'TX_STATUS_SUCCESS' })

		expect(solanaMock.writeReport?.(makeWriteReportRequest(PROGRAM_A))).toEqual({
			txStatus: 'TX_STATUS_SUCCESS',
		})
	})
})
