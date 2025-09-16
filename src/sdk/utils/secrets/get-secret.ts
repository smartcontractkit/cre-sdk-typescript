import { doGetSecret } from '@cre/sdk/utils/secrets/do-get-secret'
import { awaitAsyncSecret } from '@cre/sdk/utils/secrets/await-async-secret'
import { LazyPromise } from '@cre/sdk/utils/lazy-promise'
import { runtimeGuards } from '@cre/sdk/runtime/runtime'

export const getSecret = (id: string): Promise<any> => {
	// Getting secrets should only be possible in DON mode
	runtimeGuards.assertDonSafe()

	const callbackId = doGetSecret(id)

	return new LazyPromise(async () => awaitAsyncSecret(callbackId))
}
