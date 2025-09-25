import { Mode, type SecretRequest } from '@cre/generated/sdk/v1alpha/sdk_pb'

export class DonModeError extends Error {
	constructor() {
		super('cannot use Runtime inside RunInNodeMode')
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
		public sceretRequest: SecretRequest,
		public error: String,
	) {
		super(`error fetching ${sceretRequest}: ${error}`)
	}
}
