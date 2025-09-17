import type { Mode } from '@cre/generated/sdk/v1alpha/sdk_pb'

export class CapabilityError extends Error {
	public name: string
	public capabilityId?: string
	public method?: string
	public mode?: Mode
	public callbackId?: number

	constructor(
		message: string,
		options?: {
			capabilityId?: string
			method?: string
			mode?: Mode
			callbackId?: number
		},
	) {
		super(message)
		this.name = 'CapabilityError'

		if (options) {
			this.capabilityId = options.capabilityId
			this.method = options.method
			this.mode = options.mode
			this.callbackId = options.callbackId
		}
	}
}
