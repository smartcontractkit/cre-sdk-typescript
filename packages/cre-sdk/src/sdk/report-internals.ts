import type { Address } from 'viem'

// Do not re-export in index.ts to avoid exposing it to the public API.
// This is public to allow the cache to be cleared in the tests.

export type DonInfo = {
	f: number
	signers: Map<Address, number>
	// solanaSigners maps Solana signer address → nodeOperatorId, read from the consensus capability's OCR3 config.
	// solanaSignersError is set when the DON does not publish Solana signers; it only fails Solana report verification.
	solanaSigners?: Map<Address, number>
	solanaSignersError?: Error
}

// Do not re-export in index.ts to avoid exposing it to the public API.
// donInfoCache exists outside Report to allow testing to clear the cache.
export var donInfoCache = new Map<string, DonInfo>()
