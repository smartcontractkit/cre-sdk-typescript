import type { Outputs } from '@cre/generated/capabilities/internal/basictrigger/v1/basic_trigger_pb'
import { BasicCapability as BasicTriggerCapability } from '@cre/generated-sdk/capabilities/internal/basictrigger/v1/basic_sdk_gen'
import { cre, type Runtime } from '@cre/sdk/cre'
import { Value } from '@cre/sdk/utils'
import { SecretsError } from '@cre/sdk/utils/secrets-error'
import { Runner } from '@cre/sdk/wasm'

const handleSecret = async (runtime: Runtime<Uint8Array>, _: Outputs) => {
	return await runtime.getSecret({ id: 'Foo' })
}

const initWorkflow = () => {
	const basicTrigger = new BasicTriggerCapability()

	return [cre.handler(basicTrigger.trigger({}), handleSecret)]
}

export async function main() {
	console.log(`TS workflow: standard test: secrets [${new Date().toISOString()}]`)

	const runner = await Runner.newRunner<Uint8Array>({})
	await runner.run(initWorkflow)
}

await main()
