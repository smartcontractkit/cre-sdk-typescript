declare global {
	/**
	 * @deprecated fetch is not available in CRE WASM workflows.
	 * Use cre.capabilities.HTTPClient instead.
	 * @see https://docs.chain.link/cre/concepts/typescript-wasm-runtime
	 */
	function fetch(_notAvailable: never): never

	/**
	 * @deprecated setTimeout is not available in CRE WASM workflows. Use cre.capabilities.CronCapability for scheduling.
	 * @see https://docs.chain.link/cre/concepts/typescript-wasm-runtime
	 */
	function setTimeout(_notAvailable: never, ..._args: never[]): never

	/**
	 * @deprecated setInterval is not available in CRE WASM workflows. Use cre.capabilities.CronCapability for scheduling.
	 * @see https://docs.chain.link/cre/concepts/typescript-wasm-runtime
	 */
	function setInterval(_notAvailable: never, ..._args: never[]): never
}

export {}
