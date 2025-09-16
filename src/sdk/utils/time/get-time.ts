import { hostBindings } from '@cre/sdk/runtime/host-bindings'

/**
 * Gets the current time from the host runtime
 * This function calls the host's `now` function which respects the current mode
 * (DON or NODE) and calls the appropriate time function on the host.
 *
 * The Rust plugin handles all the low-level WASM memory management internally,
 * so we just get a clean Unix timestamp in milliseconds.
 *
 * @returns The current time as a Unix timestamp in milliseconds
 */
export const getTime = (): number => {
	return hostBindings.now()
}

/**
 * Gets the current time as a Date object
 * @returns The current time as a Date object
 */
export const getTimeAsDate = (): Date => {
	return new Date(getTime())
}
