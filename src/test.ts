import { LazyPromise } from '@cre/sdk/utils/lazy-promise'

function getPromise(arg: string): Promise<string> {
	return new LazyPromise(async () => {
		console.log(`Running logic for: ${arg}`)
		// simulate async work
		await new Promise((res) => setTimeout(res, 500))
		return `${arg} - done`
	})
}

console.log('Just a scratchpad for testing \n\n')

const promise = getPromise('test1')
const promise2 = getPromise('test2')

await promise2
await promise

// Write your code here and run it with `bun src/test.ts`.
// It's a quick and easy way to make sure TS part works as expected.

console.log('Thanks for using the scratchpad!')
