/**
 * Chain-agnostic core of the per-contract mock routing used by
 * `addContractMock` (EVM) and `addSolanaContractMock` (Solana).
 *
 * Builds a handler that routes a request to `handle` when `matches` returns
 * true, falls through to the previously installed handler otherwise, and
 * throws `noMatchError` when there is nothing to fall through to. Installing
 * the returned handler over the previous one is what lets multiple contract
 * mocks chain on the same capability mock.
 */
export function chainContractHandler<TReq, TReply>(options: {
	previous: ((req: TReq) => TReply) | undefined
	matches: (req: TReq) => boolean
	handle: (req: TReq) => TReply
	noMatchError: (req: TReq) => string
}): (req: TReq) => TReply {
	const { previous, matches, handle, noMatchError } = options
	return (req: TReq): TReply => {
		if (!matches(req)) {
			if (previous) return previous(req)
			throw new Error(noMatchError(req))
		}
		return handle(req)
	}
}
