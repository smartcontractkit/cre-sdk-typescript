export class CapabilityError extends Error {
	public name: string
	public capabilityId?: string
	public method?: string
	public callbackId?: number

	constructor(
		message: string,
		options?: {
			capabilityId?: string
			method?: string
			callbackId?: number
		},
	) {
		super(message)
		this.name = 'CapabilityError'

		if (options) {
			this.capabilityId = options.capabilityId
			this.method = options.method
			this.callbackId = options.callbackId
		}
	}
}
