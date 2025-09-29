import { BasicActionCapability } from '@cre/generated-sdk/capabilities/internal/basicaction/v1/basicaction_sdk_gen'
import { BasicCapability as BasicTriggerCapability } from '@cre/generated-sdk/capabilities/internal/basictrigger/v1/basic_sdk_gen'
import { cre, type Runtime } from '@cre/sdk/cre'
import { Runner } from '@cre/sdk/wasm'

const asyncCalls = (runtime: Runtime<Uint8Array>) => {
	const basicAction = new BasicActionCapability()

	const input1 = { inputThing: true }
	const input2 = { inputThing: false }

	// Notice: we call perform action on input1 and then input 2.
	const p1 = basicAction.performAction(runtime, input1)
	const p2 = basicAction.performAction(runtime, input2)

	// We get results in the reverse order.
	const r2 = p2.result()
	const r1 = p1.result()

	return `${r1.adaptedThing}${r2.adaptedThing}`
}

const initWorkflow = () => {
	const basicTrigger = new BasicTriggerCapability()
	return [cre.handler(basicTrigger.trigger({}), asyncCalls)]
}

export async function main() {
	console.log(
		`TS workflow: standard test: capability calls are async [${new Date().toISOString()}]`,
	)

	const runner = await Runner.newRunner<Uint8Array>({
		configParser: (c) => c,
	})
	runner.run(initWorkflow)
}

await main()
