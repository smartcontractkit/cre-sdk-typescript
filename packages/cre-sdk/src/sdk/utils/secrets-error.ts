export class SecretsError extends Error {
	constructor(
		message: string,

		// TODO: think if adding more info would be useful and how to do it
		// public id?: string,
		// public namespace?: string,
		// public owner?: number
	) {
		super(message)
		this.name = 'SecretsError'
	}
}
