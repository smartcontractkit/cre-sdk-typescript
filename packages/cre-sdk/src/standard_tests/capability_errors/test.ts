import { isCapabilityExecutionError, UnrecognisedErrorCode } from '@cre/capabilities/errors'
import { BasicActionCapability } from '@cre/generated-sdk/capabilities/internal/basicaction/v1/basicaction_sdk_gen'
import { BasicCapability as BasicTriggerCapability } from '@cre/generated-sdk/capabilities/internal/basictrigger/v1/basic_sdk_gen'
import { cre, type Runtime } from '@cre/sdk/cre'
import { Runner } from '@cre/sdk/wasm'

const checkCapabilityErrors = (runtime: Runtime<Uint8Array>) => {
	const basicAction = new BasicActionCapability()
	const input = { inputThing: true }

	while (true) {
		try {
			const output = basicAction.performAction(runtime, input).result()
			if (output.adaptedThing !== 'Done') {
				throw new Error(`expected Done response, got ${output.adaptedThing}`)
			}
			return 'Done'
		} catch (err) {
			if (!isCapabilityExecutionError(err)) {
				throw new Error(`expected capability error, got ${String(err)}`)
			}
			if (err.code === UnrecognisedErrorCode) {
				throw new Error('expected recognised error code, got UnrecognisedErrorCode')
			}
		}
	}
}

const initWorkflow = () => {
	const basicTrigger = new BasicTriggerCapability()

	return [cre.handler(basicTrigger.trigger({}), checkCapabilityErrors)]
}

export async function main() {
	console.log(`TS workflow: standard test: capability errors [${new Date().toISOString()}]`)

	const runner = await Runner.newRunner<Uint8Array>({
		configParser: (c) => c,
	})
	await runner.run(initWorkflow)
}

await main()
