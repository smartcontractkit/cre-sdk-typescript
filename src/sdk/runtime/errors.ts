import { Mode, type SecretRequest } from '@cre/generated/sdk/v1alpha/sdk_pb'

export class DonModeError extends Error {

	constructor() {
		super('cannot use DON Runtime inside Node mode')
	}
}

export class NodeModeError extends Error {
	constructor() {
		super('cannot use Node Runtime inside DON mode')
		this.name = 'NodeModeError'
	}
}

export class SecretsError extends Error {
	constructor(public sceretRequest: SecretRequest, public error: String) { super(`error fetching ${sceretRequest}: ${error}`) }
}