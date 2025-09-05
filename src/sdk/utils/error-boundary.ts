import { DonModeError, NodeModeError } from '@cre/sdk/runtime/errors'

export const errorBoundary = (e: any) => {
	// TODO: links should be configurable
	if (e instanceof DonModeError || e instanceof NodeModeError) {
		console.log(`


[${e.constructor.name}]: ${e.message}.

Learn more about mode switching here: https://documentation-preview-git-cre-priv-577744-chainlink-labs-devrel.vercel.app/cre/getting-started/part-2-fetching-data#step-2-understand-the-runinnodemode-pattern


`)
	} else if (e instanceof Error) {
		console.log(e.message)
		console.log(e.stack)
	} else {
		console.log(e)
	}
}

export const withErrorBoundary = async (fn: () => Promise<void>) => {
	try {
		await fn()
	} catch (e) {
		errorBoundary(e)
	}
}
