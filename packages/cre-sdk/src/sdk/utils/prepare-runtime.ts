import { atob, Buffer, btoa } from 'node:buffer'
import { URL, URLSearchParams } from 'node:url'

/**
 * This function is used to prepare the runtime for the SDK to work.
 * It should be called as a part of SDK initialization.
 * It exposes Node.js APIs in global namespace, so they can be bundled and used in workflow code.
 */
export const prepareRuntime = () => {
	globalThis.Buffer = Buffer
	globalThis.atob = atob
	globalThis.btoa = btoa
	// node:url constructor types are slightly narrower than lib.dom/global types.
	// Runtime behavior is compatible; cast to the global constructor shapes.
	globalThis.URL = URL as unknown as typeof globalThis.URL
	globalThis.URLSearchParams = URLSearchParams as unknown as typeof globalThis.URLSearchParams
}
