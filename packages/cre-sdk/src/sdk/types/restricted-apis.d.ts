declare global {
	/** @deprecated fetch is not available in CRE WASM workflows. Use cre.capabilities.HTTPClient instead. */
	const fetch: never

	/** @deprecated window is not available in CRE WASM workflows. */
	const window: never

	/** @deprecated document is not available in CRE WASM workflows. */
	const document: never

	/** @deprecated XMLHttpRequest is not available in CRE WASM workflows. Use cre.capabilities.HTTPClient instead. */
	const XMLHttpRequest: never

	/** @deprecated localStorage is not available in CRE WASM workflows. */
	const localStorage: never

	/** @deprecated sessionStorage is not available in CRE WASM workflows. */
	const sessionStorage: never

	/** @deprecated setTimeout is not available in CRE WASM workflows. Use cre.capabilities.CronCapability for scheduling. */
	const setTimeout: never

	/** @deprecated setInterval is not available in CRE WASM workflows. Use cre.capabilities.CronCapability for scheduling. */
	const setInterval: never
}

export {}
