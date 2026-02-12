import { BasicCapability as BasicTriggerCapability } from '@cre/generated-sdk/capabilities/internal/basictrigger/v1/basic_sdk_gen'
import { cre, type Runtime } from '@cre/sdk/cre'
import { Runner } from '@cre/sdk/wasm'

const handler = (runtime: Runtime<Uint8Array>) => {
	// Get the host time
	const t = runtime.now()

	// Format as ISO 8601 UTC with no fractional seconds
	// toISOString() returns format like "2020-01-02T03:04:05.000Z"
	// We need to strip fractional seconds to match the exact format
	const isoString = t.toISOString().replace(/\.\d{3}Z$/, 'Z')

	return isoString
}

const initWorkflow = () => {
	const basicTrigger = new BasicTriggerCapability()

	return [cre.handler(basicTrigger.trigger({}), handler)]
}

export async function main() {
	console.log(`TS workflow: standard test: time_interpretation [${new Date().toISOString()}]`)

	const runner = await Runner.newRunner<Uint8Array>({
		configParser: (c) => c,
	})
	runner.run(initWorkflow)
}

await main()
