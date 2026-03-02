declare global {
	/**
	 * @deprecated fetch is not available in CRE WASM workflows.
	 * Use cre.capabilities.HTTPClient instead.
	 */
	function fetch(_notAvailable: never): never

	/** @deprecated setTimeout is not available in CRE WASM workflows. Use cre.capabilities.CronCapability for scheduling. */
	function setTimeout(_notAvailable: never, ..._args: never[]): never

	/** @deprecated setInterval is not available in CRE WASM workflows. Use cre.capabilities.CronCapability for scheduling. */
	function setInterval(_notAvailable: never, ..._args: never[]): never
}

export {}
