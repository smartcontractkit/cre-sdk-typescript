import { Mode, type SecretRequest } from '@cre/generated/sdk/v1alpha/sdk_pb'

export class DonModeError extends Error {
	constructor() {
		super('cannot use Runtime inside RunInNodeMode')
		this.name = 'DonModeError'
	}
}

export class NodeModeError extends Error {
	constructor() {
		super('cannot use NodeRuntime outside RunInNodeMode')
		this.name = 'NodeModeError'
	}
}

export class SecretsError extends Error {
	constructor(
		public secretRequest: SecretRequest,
		public error: string,
	) {
		super(
			`secret retrieval failed for ${secretRequest.id || 'unknown'} (namespace: ${secretRequest.namespace || 'default'}): ${error}. Verify the secret name is correct and that the secret has been configured for this workflow`,
		)
		this.name = 'SecretsError'
	}
}
