import { cre, type Runtime } from '@cre/sdk/cre'
import { BasicCapability as BasicTriggerCapability } from '@cre/generated-sdk/capabilities/internal/basictrigger/v1/basic_sdk_gen'
import { SecretsError } from '@cre/sdk/utils/secrets-error'
import { Value } from '@cre/sdk/utils/values/value'

// Doesn't matter for this test
type Config = any

const handleSecret = async (_config: Config, runtime: Runtime) => {
	try {
		const secret = await runtime.getSecret('Foo')
		cre.sendResponseValue(new Value(secret))
	} catch (error) {
		// One of the tests covers the lack of particular secret.
		// We cover that in this catch block, however any other error should still be thrown.
		// TODO: should SecretsError be exposed via cre?
		if (error instanceof SecretsError) {
			cre.sendError(error.message)
		} else {
			throw error
		}
	}
}

const initWorkflow = () => {
	const basicTrigger = new BasicTriggerCapability()

	return [cre.handler(basicTrigger.trigger({}), handleSecret)]
}

export async function main() {
	console.log(`TS workflow: standard test: secrets [${new Date().toISOString()}]`)

	const runner = await cre.newRunner<Config>()
	await runner.run(initWorkflow)
}

cre.withErrorBoundary(main)
