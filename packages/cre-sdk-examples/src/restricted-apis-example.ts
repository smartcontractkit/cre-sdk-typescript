/**
 * This example shows how CRE workflows mark restricted APIs as deprecated in TS.
 *
 * The restricted APIs covered in this example are:
 * - fetch
 * - setTimeout
 * - setInterval
 *
 * Other unsupported globals/modules are enforced by cre-compile runtime checks.
 * There are also NodeJS APIs that do work with the QuickJS runtime, like console.log.
 */

export const testFetch = async () => {
	// @ts-expect-error - fetch is not available in the CRE SDK
	fetch('https://api.chain.link/v1/price?symbol=ETH/USD')
}

export const testSetTimeout = async () => {
	// @ts-expect-error - setTimeout is not available in the CRE SDK
	setTimeout(() => {
		console.log('Hello, world!')
	}, 1000)
}

export const testSetInterval = async () => {
	// @ts-expect-error - setInterval is not available in the CRE SDK
	setInterval(() => {
		console.log('Hello, world!')
	}, 1000)
}
