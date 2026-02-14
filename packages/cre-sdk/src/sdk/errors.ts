import { Mode, type SecretRequest } from '@cre/generated/sdk/v1alpha/sdk_pb'

export class DonModeError extends Error {
	constructor() {
		super('cannot use DON-mode API inside RunInNodeMode: you are calling a DON-mode API (e.g., generateReport, getSecret) from inside a RunInNodeMode callback. DON-mode APIs aggregate results across all nodes and cannot be called from node-specific code. Move this call outside of RunInNodeMode()')
		this.name = 'DonModeError'
	}
}

export class NodeModeError extends Error {
	constructor() {
		super('cannot use NodeRuntime outside RunInNodeMode: you are calling a node-mode API (e.g., callCapability, getSecret) from DON-mode code. Node-mode APIs can only be called inside a runtime.runInNodeMode() callback. Wrap your node-mode logic inside runInNodeMode(async (nodeRuntime) => { ... })')
		this.name = 'NodeModeError'
	}
}

export class SecretsError extends Error {
	constructor(
		public secretRequest: SecretRequest,
		public error: String,
	) {
		super(`secret retrieval failed for ${secretRequest}: ${error}. Verify the secret name is correct and that the secret has been configured for this workflow`)
		this.name = 'SecretsError'
	}
}
