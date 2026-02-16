import { BasicActionCapability } from '@cre/generated-sdk/capabilities/internal/basicaction/v1/basicaction_sdk_gen'
import { BasicCapability as BasicTriggerCapability } from '@cre/generated-sdk/capabilities/internal/basictrigger/v1/basic_sdk_gen'
import { cre, type Runtime } from '@cre/sdk/cre'
import { Runner } from '@cre/sdk/wasm'

const asyncCalls = (runtime: Runtime<Uint8Array>) => {
	const basicAction = new BasicActionCapability()
	const input = { inputThing: true }
	const p = basicAction.performAction(runtime, input)

	p.result()

	return `We should not get here, result should throw an error`
}

const initWorkflow = () => {
	const basicTrigger = new BasicTriggerCapability()
	return [cre.handler(basicTrigger.trigger({}), asyncCalls)]
}

export async function main() {
	console.log(
		`TS workflow: standard test: host_wasm_write_errors_are_respected [${new Date().toISOString()}]`,
	)

	const runner = await Runner.newRunner<Uint8Array>({
		configParser: (c) => c,
	})
	runner.run(initWorkflow)
}

await main()
