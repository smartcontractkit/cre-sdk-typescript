import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import zlib from 'node:zlib'

function log(...args: any[]) {
	console.log('[cre-sdk-javy-plugin]', ...args)
}

const exists = (p: string) => {
	try {
		fs.accessSync(p)
		return true
	} catch {
		return false
	}
}
const mkdirp = (p: string) => fs.mkdirSync(p, { recursive: true })

async function downloadText(url: string) {
	const res = await fetch(url)
	if (!res.ok) {
		throw new Error(`HTTP ${res.status} for ${url}`)
	}
	return res.text()
}

async function downloadBinary(url: string) {
	const res = await fetch(url)
	if (!res.ok) {
		throw new Error(`HTTP ${res.status} for ${url}`)
	}
	const ab = await res.arrayBuffer()
	return Buffer.from(ab)
}

function verifySha256(buffer: Buffer, expectedHex: string) {
	const actual = crypto.createHash('sha256').update(buffer).digest('hex')
	if (!expectedHex || expectedHex.length < 64 || expectedHex !== actual) {
		throw new Error(`Checksum failed: expected ${expectedHex}, got ${actual}`)
	}
}

function writeFileAtomic(dest: string, data: Buffer, mode: number) {
	const dir = path.dirname(dest)
	mkdirp(dir)
	const tmp = path.join(dir, `${path.basename(dest)}.${process.pid}.${Date.now()}.tmp`)
	fs.writeFileSync(tmp, data, { mode })
	fs.renameSync(tmp, dest)
}

/**
Lock file helpers for Unix-like platforms
*/
function readLock(lockPath: string): { pid: number; time: number } | null {
	try {
		const txt = fs.readFileSync(lockPath, 'utf8').trim()
		if (!txt) {
			return null
		}
		const obj = JSON.parse(txt)
		if (
			typeof obj === 'object' &&
			obj &&
			typeof obj.pid === 'number' &&
			typeof obj.time === 'number'
		) {
			return { pid: obj.pid, time: obj.time }
		}
		return null
	} catch {
		return null
	}
}

function writeLockExclusive(lockPath: string) {
	mkdirp(path.dirname(lockPath))
	const fd = fs.openSync(
		lockPath,
		fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY,
	)
	try {
		fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, time: Date.now() }), 'utf8')
	} finally {
		fs.closeSync(fd)
	}
}

function tryAcquireLock(lockPath: string): boolean {
	try {
		writeLockExclusive(lockPath)
		return true
	} catch {
		return false
	}
}

function pidLooksAlive(pid: number): boolean {
	if (!Number.isFinite(pid) || pid <= 0) {
		return false
	}
	try {
		process.kill(pid, 0 as any)
		return true
	} catch (e: any) {
		if (e && e.code === 'ESRCH') {
			return false
		}
		if (e && e.code === 'EPERM') {
			return true
		}
		return false
	}
}

function forceReplaceLock(lockPath: string): boolean {
	try {
		if (exists(lockPath)) {
			fs.unlinkSync(lockPath)
		}
	} catch {}
	try {
		writeLockExclusive(lockPath)
		return true
	} catch {
		return false
	}
}

async function acquireLock(
	lockPath: string,
	{
		totalTimeoutMs = 3_000,
		pollMs = 100,
		staleMs = 120_000,
	}: { totalTimeoutMs?: number; pollMs?: number; staleMs?: number } = {},
): Promise<boolean> {
	mkdirp(path.dirname(lockPath))

	if (tryAcquireLock(lockPath)) {
		log('Acquired lock', lockPath, 'pid=', process.pid)
		return true
	}

	const start = Date.now()
	log('Waiting for lock...', lockPath)

	while (Date.now() - start < totalTimeoutMs) {
		await new Promise((r) => setTimeout(r, pollMs))
		if (tryAcquireLock(lockPath)) {
			log('Acquired lock after wait', lockPath, 'pid=', process.pid)
			return true
		}
	}

	const meta = readLock(lockPath)
	const age = meta ? Date.now() - meta.time : null
	const alive = meta ? pidLooksAlive(meta.pid) : false
	log('Lock timeout. meta=', meta, 'age=', age, 'alive=', alive)

	// If unreadable, dead, or too old => replace
	if (!meta || !alive || (age != null && age > staleMs)) {
		if (forceReplaceLock(lockPath)) {
			log('Replaced stale/unreadable lock', lockPath, 'pid=', process.pid)
			return true
		}
	}

	return false
}

/**
 * Windows-specific implementation (no lock file needed)
 */
async function ensureJavyWindows(version: string) {
	const base = 'https://github.com/bytecodealliance/javy/releases/download'
	const name = `javy-x86_64-windows-${version}`
	const gzUrl = `${base}/${version}/${name}.gz`
	const shaUrl = `${base}/${version}/${name}.gz.sha256`

	const cacheDir = path.join(os.homedir(), '.cache', 'javy', version, 'win32-x64')
	const outName = 'javy.exe'
	const cacheBin = path.join(cacheDir, outName)

	if (exists(cacheBin)) {
		log('Using cached binary:', cacheBin)
		return cacheBin
	}

	mkdirp(cacheDir)

	const tempBin = path.join(cacheDir, `${outName}.${process.pid}.${Date.now()}.tmp`)

	try {
		if (exists(cacheBin)) {
			log('Binary appeared while setting up; using it.')
			return cacheBin
		}

		log('Downloading sha256:', shaUrl)
		log('Downloading binary:', gzUrl)

		const [shaText, gzBuf] = await Promise.all([downloadText(shaUrl), downloadBinary(gzUrl)])

		const expected = shaText.trim().split(/\s+/)[0]
		log('Verifying checksum...')
		verifySha256(gzBuf, expected)

		log('Decompressing .gz...')
		let exeBuf: Buffer
		try {
			exeBuf = zlib.gunzipSync(gzBuf)
		} catch (e: any) {
			throw new Error(`Failed to gunzip artifact; ensure URL is a .gz. ${e?.message || e}`)
		}

		log('Writing executable:', cacheBin)
		fs.writeFileSync(tempBin, exeBuf, { mode: 0o755 })

		// Atomic rename - if another process already created it, we'll use theirs
		try {
			fs.renameSync(tempBin, cacheBin)
			log('Installed Javy at', cacheBin)
		} catch (err: any) {
			if (err.code === 'EEXIST' || exists(cacheBin)) {
				log('Binary was created by another process, using that')
				try {
					fs.unlinkSync(tempBin)
				} catch {}
			} else {
				throw err
			}
		}

		return cacheBin
	} catch (e: any) {
		try {
			if (exists(tempBin)) fs.unlinkSync(tempBin)
		} catch {}

		throw new Error(`Failed to install Javy ${version} on Windows x64: ${e?.message || String(e)}`)
	}
}

/**
 * Unix-like implementation (uses lock file)
 */
async function ensureJavyUnix(version: string, platform: string, arch: string) {
	const base = 'https://github.com/bytecodealliance/javy/releases/download'

	// Platform-specific naming
	let name: string
	let outName: string
	if (platform === 'darwin') {
		name = arch === 'arm64' ? `javy-arm-macos-${version}` : `javy-x86_64-macos-${version}`
		outName = 'javy'
	} else if (platform === 'linux') {
		name = arch === 'arm64' ? `javy-arm-linux-${version}` : `javy-x86_64-linux-${version}`
		outName = 'javy'
	} else {
		throw new Error(`Unsupported platform: ${platform}`)
	}

	const gzUrl = `${base}/${version}/${name}.gz`
	const shaUrl = `${base}/${version}/${name}.gz.sha256`

	const cacheDir = path.join(os.homedir(), '.cache', 'javy', version, `${platform}-${arch}`)
	const cacheBin = path.join(cacheDir, outName)
	const lock = path.join(cacheDir, '.lock')

	if (exists(cacheBin)) {
		log('Using cached binary:', cacheBin)
		return cacheBin
	}

	mkdirp(cacheDir)

	const weHoldLock = await acquireLock(lock, {
		totalTimeoutMs: 3_000,
		pollMs: 100,
		staleMs: 120_000,
	})

	if (!weHoldLock) {
		if (exists(cacheBin)) {
			log('Binary appeared while waiting; using it.')
			return cacheBin
		}
		throw new Error(
			`Could not acquire installation lock at ${lock}. Another process may still be running.`,
		)
	}

	try {
		if (exists(cacheBin)) return cacheBin

		log('Downloading sha256:', shaUrl)
		log('Downloading binary:', gzUrl)

		const [shaText, gzBuf] = await Promise.all([downloadText(shaUrl), downloadBinary(gzUrl)])

		const expected = shaText.trim().split(/\s+/)[0]
		log('Verifying checksum...')
		verifySha256(gzBuf, expected)

		log('Decompressing .gz...')
		let binBuf: Buffer
		try {
			binBuf = zlib.gunzipSync(gzBuf)
		} catch (e: any) {
			throw new Error(`Failed to gunzip artifact; ensure URL is a .gz. ${e?.message || e}`)
		}

		log('Writing executable:', cacheBin)
		writeFileAtomic(cacheBin, binBuf, 0o755)

		log('Installed Javy at', cacheBin)
		return cacheBin
	} catch (e: any) {
		throw new Error(
			`Failed to install Javy ${version} on ${platform} ${arch}: ${e?.message || String(e)}`,
		)
	} finally {
		try {
			if (exists(lock)) {
				fs.unlinkSync(lock)
				log('Released lock', lock)
			}
		} catch {}
	}
}

/**
 * Main entry point - detects platform and delegates
 */
export async function ensureJavy({ version = 'v5.0.4' } = {}) {
	const platform = os.platform()
	const arch = os.arch()

	log(`Detected platform: ${platform}, arch: ${arch}`)

	if (platform === 'win32') {
		if (arch !== 'x64') {
			throw new Error(`Unsupported Windows architecture: ${arch}`)
		}
		return ensureJavyWindows(version)
	}

	if (platform === 'darwin' || platform === 'linux') {
		if (arch !== 'x64' && arch !== 'arm64') {
			throw new Error(`Unsupported architecture for ${platform}: ${arch}`)
		}
		return ensureJavyUnix(version, platform, arch)
	}

	throw new Error(`Unsupported platform: ${platform}`)
}
