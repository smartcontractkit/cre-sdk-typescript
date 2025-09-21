// Global type declarations for the CRE SDK runtime
// Those are the methods that the Host exposes to the Guest.

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
}

export {}
