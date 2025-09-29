import { toJson } from '@bufbuild/protobuf'
import type { Outputs } from '@cre/generated/capabilities/internal/basictrigger/v1/basic_trigger_pb'
import { SecretSchema } from '@cre/generated/sdk/v1alpha/sdk_pb'
import { BasicCapability as BasicTriggerCapability } from '@cre/generated-sdk/capabilities/internal/basictrigger/v1/basic_sdk_gen'
import { cre, type Runtime } from '@cre/sdk/cre'
import { Runner } from '@cre/sdk/wasm'

const handleSecret = async (runtime: Runtime<Uint8Array>, _: Outputs) => {
	const secret = runtime.getSecret({ id: 'Foo' }).result()
	const secretJson = toJson(SecretSchema, secret)

	return secretJson.value || ''
}

const initWorkflow = () => {
	const basicTrigger = new BasicTriggerCapability()

	return [cre.handler(basicTrigger.trigger({}), handleSecret)]
}

export async function main() {
	console.log(`TS workflow: standard test: secrets [${new Date().toISOString()}]`)

	const runner = await Runner.newRunner<Uint8Array>({
		configParser: (c) => c,
	})
	await runner.run(initWorkflow)
}

await main()
