// Global type declarations for the CRE SDK runtime.
// These are the methods and globals exposed by the Host to the Guest.

type ExistingGlobal<K extends PropertyKey, Fallback> =
	typeof globalThis extends Record<K, infer T> ? T : Fallback

/**
 * Host functions exposed by the CRE runtime to WASM guests
 */
declare global {
	/**
	 * Initiates an asynchronous capability call
	 * @param request - protobuf request as bytes
	 * @returns Callback ID for the async operation
	 */
	function callCapability(request: Uint8Array): number

	/**
	 * Awaits completion of async capability calls
	 * @param awaitRequest - protobuf await request as bytes
	 * @param maxResponseLen - Maximum response size in bytes
	 * @returns response as bytes
	 */
	function awaitCapabilities(awaitRequest: Uint8Array, maxResponseLen: number): Uint8Array

	/**
	 * Gets secrets asynchronously
	 * @param request - protobuf secret request as bytes
	 * @param maxResponseLen - Maximum response size in bytes
	 * @returns Callback ID for the async operation
	 */
	function getSecrets(request: Uint8Array, maxResponseLen: number): number

	/**
	 * Awaits completion of async secret requests
	 * @param awaitRequest - protobuf await secret request as bytes
	 * @param maxResponseLen - Maximum response size in bytes
	 * @returns response as bytes
	 */
	function awaitSecrets(awaitRequest: Uint8Array, maxResponseLen: number): Uint8Array

	/**
	 * Logs a message to the host runtime
	 * @param message - The message to log
	 */
	function log(message: string): void

	/**
	 * Sends a response back to the host
	 * @param response - bytes response
	 * @returns Status code (0 for success)
	 */
	function sendResponse(response: Uint8Array): number

	/**
	 * Switches execution mode between NODE and DON
	 * @param mode - The mode to switch to (0 = UNSPECIFIED, 1 = DON, 2 = NODE)
	 */
	function switchModes(mode: 0 | 1 | 2): void

	/**
	 * Indicates this is a V2 SDK workflow
	 */
	function versionV2(): void

	/**
	 * Gets a random seed from the host
	 * @param mode - 1 for non-deterministic, 2 for deterministic
	 * @returns Random seed value
	 */
	function randomSeed(mode: 1 | 2): number

	/**
	 * Gets WASI command line arguments
	 * @returns Serialized arguments
	 */
	function getWasiArgs(): string

	/**
	 * Gets the current time from the host runtime
	 * @returns Unix timestamp in milliseconds
	 */
	function now(): number

	/**
	 * Console API available in the QuickJS runtime
	 */
	type CreConsole = {
		log(...args: unknown[]): void
		warn(...args: unknown[]): void
		error(...args: unknown[]): void
		info(...args: unknown[]): void
		debug(...args: unknown[]): void
	}
	var console: ExistingGlobal<'console', CreConsole>

	/**
	 * TextEncoder/TextDecoder APIs available via Javy's text_encoding support
	 */
	interface CreTextEncoderEncodeIntoResult {
		read: number
		written: number
	}

	interface CreTextEncoder {
		readonly encoding: string
		encode(input?: string): Uint8Array
		encodeInto(input: string, dest: Uint8Array): CreTextEncoderEncodeIntoResult
	}
	var TextEncoder: ExistingGlobal<
		'TextEncoder',
		{ prototype: CreTextEncoder; new (): CreTextEncoder }
	>

	interface CreTextDecoder {
		readonly encoding: string
		readonly fatal: boolean
		readonly ignoreBOM: boolean
		decode(input?: ArrayBuffer | ArrayBufferView, options?: { stream?: boolean }): string
	}
	var TextDecoder: ExistingGlobal<
		'TextDecoder',
		{
			prototype: CreTextDecoder
			new (label?: string, options?: { fatal?: boolean; ignoreBOM?: boolean }): CreTextDecoder
		}
	>

	/**
	 * Base64 encoding/decoding — exposed via prepareRuntime() from node:buffer
	 */
	function atob(encodedData: string): string
	function btoa(stringToEncode: string): string

	/**
	 * URL and URLSearchParams — exposed via prepareRuntime() from node:url
	 */
	interface CreURLSearchParams {
		append(name: string, value: string): void
		delete(name: string): void
		get(name: string): string | null
		getAll(name: string): string[]
		has(name: string): boolean
		set(name: string, value: string): void
		sort(): void
		toString(): string
		forEach(callback: (value: string, key: string, parent: CreURLSearchParams) => void): void
		entries(): IterableIterator<[string, string]>
		keys(): IterableIterator<string>
		values(): IterableIterator<string>
		[Symbol.iterator](): IterableIterator<[string, string]>
		readonly size: number
	}
	var URLSearchParams: ExistingGlobal<
		'URLSearchParams',
		{
			prototype: CreURLSearchParams
			new (
				init?: string | Record<string, string> | [string, string][] | CreURLSearchParams,
			): CreURLSearchParams
		}
	>

	interface CreURL {
		hash: string
		host: string
		hostname: string
		href: string
		readonly origin: string
		password: string
		pathname: string
		port: string
		protocol: string
		search: string
		readonly searchParams: CreURLSearchParams
		username: string
		toString(): string
		toJSON(): string
	}
	var URL: ExistingGlobal<
		'URL',
		{ prototype: CreURL; new (url: string, base?: string | CreURL): CreURL }
	>
}

export {}
