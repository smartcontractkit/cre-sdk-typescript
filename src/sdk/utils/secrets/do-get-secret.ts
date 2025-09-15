import { GetSecretsRequestSchema, Mode } from '@cre/generated/sdk/v1alpha/sdk_pb'
import { create, toBinary } from '@bufbuild/protobuf'
import { getLastCallbackId, incrementCallbackId } from '@cre/sdk/utils/capabilities/callback-id'
import { hostBindings } from '@cre/sdk/runtime/host-bindings'

export const doGetSecret = (id: string) => {
	const callbackId = getLastCallbackId(Mode.DON)
	incrementCallbackId(Mode.DON)

	const request = create(GetSecretsRequestSchema, {
		requests: [{ id }],
		callbackId,
	})

	const result = hostBindings.getSecrets(toBinary(GetSecretsRequestSchema, request), 1024 * 1024)

	return callbackId
}
