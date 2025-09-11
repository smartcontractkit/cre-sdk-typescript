import { Mode } from '@cre/generated/sdk/v1alpha/sdk_pb'

export class DonModeError extends Error {
	public name: string
	public capabilityId?: string
	public method?: string
	public mode?: Mode

	constructor(
		message = 'cannot use Runtime inside RunInNodeMode',
		options?: {
			capabilityId?: string
			method?: string
			mode?: Mode
		},
	) {
		super(message)
		this.name = 'DonModeError'

		if (options) {
			this.capabilityId = options.capabilityId
			this.method = options.method
			this.mode = options.mode
		}
	}
}

export class NodeModeError extends Error {
	public name: string
	public capabilityId?: string
	public method?: string
	public mode?: Mode
	constructor(
		message = 'cannot use NodeRuntime outside RunInNodeMode',
		options?: {
			capabilityId?: string
			method?: string
			mode?: Mode
		},
	) {
		super(message)
		this.name = 'NodeModeError'

		if (options) {
			this.capabilityId = options.capabilityId
			this.method = options.method
			this.mode = options.mode
		}
	}
}
