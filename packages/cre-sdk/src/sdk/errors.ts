import type { SecretRequest } from '@cre/generated/sdk/v1alpha/sdk_pb'

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

export class NullReportError extends Error {
	constructor() {
		super('null report')
		this.name = 'NullReportError'
	}
}

export class WrongSignatureCountError extends Error {
	constructor() {
		super('wrong number of signatures')
		this.name = 'WrongSignatureCountError'
	}
}

export class ParseSignatureError extends Error {
	constructor() {
		super('failed to parse signature')
		this.name = 'ParseSignatureError'
	}
}

export class RecoverSignerError extends Error {
	constructor() {
		super('failed to recover signer address from signature')
		this.name = 'RecoverSignerError'
	}
}

export class UnknownSignerError extends Error {
	constructor() {
		super('invalid signature')
		this.name = 'UnknownSignerError'
	}
}

export class DuplicateSignerError extends Error {
	constructor() {
		super('duplicate signer')
		this.name = 'DuplicateSignerError'
	}
}

export class RawReportTooShortError extends Error {
	constructor(
		public readonly need: number,
		public readonly got: number,
	) {
		super(`raw report too short to contain metadata header: need ${need} bytes, got ${got}`)
		this.name = 'RawReportTooShortError'
	}
}
