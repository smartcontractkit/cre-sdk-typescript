import { $ } from 'bun'

export const main = async () => {
	try {
		await $`bun x cre-setup`
	} catch {
		await $`bun --bun ../cre-sdk-javy-plugin/bin/setup.ts`
	}
}
