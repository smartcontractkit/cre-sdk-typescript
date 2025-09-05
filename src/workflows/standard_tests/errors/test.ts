import { sendErrorWrapped } from '@cre/sdk/testhelpers/send-error-wrapped'
import { prepareRuntime } from '@cre/sdk/utils/prepare-runtime'

export async function main() {
	console.log(`TS workflow: standard test: errors [${new Date().toISOString()}]`)

	prepareRuntime()
	versionV2()

	sendErrorWrapped(new Error('workflow execution failure'))
}

main()
