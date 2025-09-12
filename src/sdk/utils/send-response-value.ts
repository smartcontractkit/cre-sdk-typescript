import { Value } from '@cre/sdk/utils/values/value'
import { type ExecutionResult, ExecutionResultSchema } from '@cre/generated/sdk/v1alpha/sdk_pb'
import { create, toBinary } from '@bufbuild/protobuf'

export const sendResponseValue = (value: Value): void => {
	// Insert into the correct oneof field: 'payload'
	const execResult: ExecutionResult = create(ExecutionResultSchema, {
		result: {
			case: 'value',
			value: value.proto,
		},
	})

	// Marshal to protobuf bytes
	const encoded = toBinary(ExecutionResultSchema, execResult)

	// Send the result
	sendResponse(encoded)
}
