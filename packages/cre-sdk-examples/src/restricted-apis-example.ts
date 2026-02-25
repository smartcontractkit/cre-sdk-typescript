/**
 * This example shows how CRE workflows mark restricted APIs as deprecated in TS.
 *
 * The restricted APIs covered in this example are:
 * - fetch
 * - window
 * - document
 * - XMLHttpRequest
 * - localStorage
 * - sessionStorage
 * - setTimeout
 * - setInterval
 *
 * There are also NodeJS APIs that do work with the QuickJS runtime, like console.log, which this file covers.
 */

export const testFetch = async () => {
	// @ts-expect-error - fetch is not available in the CRE SDK
	fetch('https://api.chain.link/v1/price?symbol=ETH/USD')
}

export const testWindow = async () => {
	// @ts-expect-error - window is not available in the CRE SDK
	window.alert('Hello, world!')
}

export const testDocument = async () => {
	// @ts-expect-error - document is not available in the CRE SDK
	document.body.innerHTML = 'Hello, world!'
}

export const testXMLHttpRequest = async () => {
	// @ts-expect-error - XMLHttpRequest is not available in the CRE SDK
	new XMLHttpRequest()
}

export const testLocalStorage = async () => {
	// @ts-expect-error - localStorage is not available in the CRE SDK
	localStorage.setItem('test', 'Hello, world!')
}

export const testSessionStorage = async () => {
	// @ts-expect-error - sessionStorage is not available in the CRE SDK
	sessionStorage.setItem('test', 'Hello, world!')
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
