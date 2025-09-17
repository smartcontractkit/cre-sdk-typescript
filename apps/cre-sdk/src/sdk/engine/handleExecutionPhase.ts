import { fromBinary } from '@bufbuild/protobuf'
import type { CapabilityResponse, ExecuteRequest } from '@cre/generated/sdk/v1alpha/sdk_pb'
import type { Runtime } from '@cre/sdk/runtime/runtime'
import { getTypeUrl } from '@cre/sdk/utils/typeurl'
import type { Workflow } from '@cre/sdk/workflow'

export const handleExecutionPhase = async <TConfig>(
	req: ExecuteRequest,
	workflow: Workflow<TConfig>,
	config: TConfig,
	runtime: Runtime,
): Promise<CapabilityResponse | undefined> => {
	if (req.request.case !== 'trigger') {
		return
	}

	const triggerMsg = req.request.value
	const index = Number(triggerMsg.id)
	if (Number.isFinite(index) && index >= 0 && index < workflow.length) {
		const entry = workflow[index]
		const schema = entry.trigger.outputSchema()
		const payloadAny = triggerMsg.payload
		if (!payloadAny) {
			return
		}

		// Extra safety: verify payload typeUrl matches expected schema type
		const expectedTypeUrl = getTypeUrl(schema)
		if (payloadAny.typeUrl && payloadAny.typeUrl !== expectedTypeUrl) {
			return
		}

		/**
		 * Note: do not hardcode method name; routing by id is authoritative.
		 *
		 * This matches the GO SDK behavior, which also just checks for the id.
		 *
		 * @see https://github.com/smartcontractkit/cre-sdk-go/blob/5a41d81e3e072008484e85dc96d746401aafcba2/cre/wasm/runner.go#L81
		 * */
		const decoded = fromBinary(schema, payloadAny.value)
		const adapted = await entry.trigger.adapt(decoded)

		// By default config is a JSON string, send as bytes
		const handlerEnv: TConfig = config || JSON.parse(Buffer.from(req.config).toString())
		await entry.fn(handlerEnv, runtime, adapted)
	}
}
