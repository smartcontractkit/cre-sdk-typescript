/**
 * This example shows how CRE workflows mark restricted Node.js modules as `never` in TS.
 *
 * CRE workflows run on QuickJS (via Javy/WASM), not full Node.js.
 * All exports from restricted modules are typed as `never`, so any usage
 * produces a clear TypeScript error at the call site.
 *
 * The restricted modules covered in this example are:
 * - node:crypto
 * - node:fs
 * - node:fs/promises
 * - node:net
 * - node:http
 * - node:https
 * - node:child_process
 * - node:os
 * - node:stream
 * - node:worker_threads
 * - node:dns
 * - node:zlib
 *
 * For HTTP requests, use cre.capabilities.HTTPClient instead of node:http/node:https/node:net.
 *
 * @see https://docs.chain.link/cre/concepts/typescript-wasm-runtime
 */

import { exec } from 'node:child_process'
import { createHash, randomBytes } from 'node:crypto'
import { lookup } from 'node:dns'
import { readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { createConnection } from 'node:net'
import { cpus, hostname } from 'node:os'
import { Readable } from 'node:stream'
import { Worker } from 'node:worker_threads'
import { createGzip } from 'node:zlib'

// --- node:crypto ---

export const testCryptoRandomBytes = () => {
	// @ts-expect-error - node:crypto is not available in CRE WASM workflows
	randomBytes(32)
}

export const testCryptoCreateHash = () => {
	// @ts-expect-error - node:crypto is not available in CRE WASM workflows
	createHash('sha256')
}

// --- node:fs ---

export const testFsReadFileSync = () => {
	// @ts-expect-error - node:fs is not available in CRE WASM workflows
	readFileSync('/etc/passwd', 'utf-8')
}

// --- node:fs/promises ---

export const testFsPromisesReadFile = async () => {
	// @ts-expect-error - node:fs/promises is not available in CRE WASM workflows
	await readFile('/etc/passwd', 'utf-8')
}

// --- node:net ---

export const testNetCreateConnection = () => {
	// @ts-expect-error - node:net is not available in CRE WASM workflows
	createConnection({ host: 'localhost', port: 8080 })
}

// --- node:http ---

export const testHttpRequest = () => {
	// @ts-expect-error - node:http is not available in CRE WASM workflows
	httpRequest('http://example.com')
}

// --- node:https ---

export const testHttpsRequest = () => {
	// @ts-expect-error - node:https is not available in CRE WASM workflows
	httpsRequest('https://example.com')
}

// --- node:child_process ---

export const testChildProcessExec = () => {
	// @ts-expect-error - node:child_process is not available in CRE WASM workflows
	exec('ls -la')
}

// --- node:os ---

export const testOsHostname = () => {
	// @ts-expect-error - node:os is not available in CRE WASM workflows
	hostname()
}

export const testOsCpus = () => {
	// @ts-expect-error - node:os is not available in CRE WASM workflows
	cpus()
}

// --- node:stream ---

export const testStreamReadable = () => {
	// @ts-expect-error - node:stream is not available in CRE WASM workflows
	new Readable()
}

// --- node:worker_threads ---

export const testWorkerThreads = () => {
	// @ts-expect-error - node:worker_threads is not available in CRE WASM workflows
	new Worker('./worker.js')
}

// --- node:dns ---

export const testDnsLookup = () => {
	// @ts-expect-error - node:dns is not available in CRE WASM workflows
	lookup('example.com', () => {})
}

// --- node:zlib ---

export const testZlibCreateGzip = () => {
	// @ts-expect-error - node:zlib is not available in CRE WASM workflows
	createGzip()
}
