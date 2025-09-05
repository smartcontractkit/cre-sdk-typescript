import { type Value } from '@cre/generated/values/v1/values_pb'
import { type ExecutionResult, ExecutionResultSchema } from '@cre/generated/sdk/v1alpha/sdk_pb'
import { create, toBinary } from '@bufbuild/protobuf'

export const sendResponseValue = (value: Value): void => {
	// Insert into the correct oneof field: 'payload'
	const execResult: ExecutionResult = create(ExecutionResultSchema, {
		result: {
			case: 'value',
			value,
		},
	})

	// Marshal to protobuf bytes
	const encoded = toBinary(ExecutionResultSchema, execResult)

	// Send the result
	sendResponse(encoded)
}
