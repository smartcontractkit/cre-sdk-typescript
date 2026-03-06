import {
	create,
	type DescMessage,
	fromJson,
	type MessageInitShape,
	type MessageJsonType,
	type MessageShape,
} from '@bufbuild/protobuf'

/**
 * Accepts either a generated message, protobuf JSON wire-format input, or a
 * MessageInitShape and normalizes it to a protobuf message instance.
 *
 * Legacy JSON input is attempted first to preserve existing behaviour for
 * callers that still pass base64/string-encoded protobuf JSON values.
 */
export function coerceMessageInput<Desc extends DescMessage>(
	schema: Desc,
	input: MessageShape<Desc> | MessageJsonType<Desc> | MessageInitShape<Desc>,
): MessageShape<Desc> {
	if ((input as { $typeName?: string }).$typeName) {
		return input as MessageShape<Desc>
	}

	try {
		return fromJson(schema, input as MessageJsonType<Desc>)
	} catch {
		return create(schema, input as MessageInitShape<Desc>)
	}
}
