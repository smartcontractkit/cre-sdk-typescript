import { BasicCapability } from '@cre/generated-sdk/capabilities/internal/basictrigger/v1/basic_sdk_gen'
import { executionMetadata } from '@cre/sdk/execution-metadata'
import { Runner } from '@cre/sdk/wasm'
import { handler } from '@cre/sdk/workflow'

const triggerNumber = 10

export async function main() {
	const runner = await Runner.newRunner<Uint8Array>({ configParser: (config) => config })
	await runner.run(() => [
		handler(
			new BasicCapability().trigger({ name: 'metadata', number: triggerNumber }),
			(runtime) => {
				const metadata = executionMetadata(runtime)
				// Match the shared host test's result contract across SDK languages.
				return {
					WorkflowID: metadata.workflowID,
					ExecutionID: metadata.executionID,
					WorkflowOwner: metadata.workflowOwner,
					DonID: metadata.donID,
					DonF: metadata.donF,
				}
			},
		),
	])
}

await main()
