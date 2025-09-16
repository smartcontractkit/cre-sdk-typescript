import { type ExecutionResult, ExecutionResultSchema } from '@cre/generated/sdk/v1alpha/sdk_pb'
import { create, toBinary } from '@bufbuild/protobuf'
import { hostBindings } from '@cre/sdk/runtime/host-bindings'

export const sendError = (error: string | Error): void => {
	// Create ExecutionResult with error
	const execResult: ExecutionResult = create(ExecutionResultSchema, {
		result: {
			case: 'error',
			value: error instanceof Error ? error.message : error,
		},
	})

	// Marshal to protobuf bytes
	const encoded = toBinary(ExecutionResultSchema, execResult)

	// Send the result
	hostBindings.sendResponse(encoded)
}
