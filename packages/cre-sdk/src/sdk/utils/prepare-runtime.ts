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
	globalThis.URL = URL as any
	globalThis.URLSearchParams = URLSearchParams
}
