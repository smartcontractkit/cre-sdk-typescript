import { getRequest } from '@cre/sdk/utils/get-request'
import { sendResponseValue } from '@cre/sdk/utils/send-response-value'
import { errorBoundary } from '@cre/sdk/utils/error-boundary'
import { prepareRuntime } from '@cre/sdk/utils/prepare-runtime'
import { val } from '@cre/sdk/utils/values/value'

export async function main() {
	console.log(`TS workflow: standard test: logging [${new Date().toISOString()}]`)

	prepareRuntime()
	versionV2()

	try {
		const executeRequest = getRequest()

		log('log from wasm!')

		sendResponseValue(val.bytes(executeRequest.config))
	} catch (e) {
		errorBoundary(e)
	}
}

main()
