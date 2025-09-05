import { getRequest } from '@cre/sdk/utils/get-request'
import { sendResponseValue } from '@cre/sdk/utils/send-response-value'
import { prepareRuntime } from '@cre/sdk/utils/prepare-runtime'
import { val } from '@cre/sdk/utils/values/value'

export async function main() {
	console.log(`TS workflow: standard test: config [${new Date().toISOString()}]`)

	prepareRuntime()
	versionV2()

	const executeRequest = getRequest()

	sendResponseValue(val.bytes(executeRequest.config))
}

main()
