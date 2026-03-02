// Restricted Node.js modules that are not available in CRE WASM workflows.
// These modules require native bindings or system access that cannot run in WebAssembly.
// Importing from these modules is allowed by TypeScript, but all exports are typed as
// `never` so any usage produces a clear error at the call site.
// See https://docs.chain.link/cre/concepts/typescript-wasm-runtime

/**
 * @deprecated node:crypto is not available in CRE WASM workflows. It requires native bindings that cannot run in WebAssembly.
 * @see https://docs.chain.link/cre/concepts/typescript-wasm-runtime
 */
declare module 'node:crypto' {
	export const randomBytes: never
	export const randomUUID: never
	export const randomInt: never
	export const randomFillSync: never
	export const randomFill: never
	export const createHash: never
	export const createHmac: never
	export const createCipheriv: never
	export const createDecipheriv: never
	export const createSign: never
	export const createVerify: never
	export const createDiffieHellman: never
	export const createDiffieHellmanGroup: never
	export const createECDH: never
	export const generateKey: never
	export const generateKeySync: never
	export const generateKeyPair: never
	export const generateKeyPairSync: never
	export const createPrivateKey: never
	export const createPublicKey: never
	export const createSecretKey: never
	export const pbkdf2: never
	export const pbkdf2Sync: never
	export const scrypt: never
	export const scryptSync: never
	export const timingSafeEqual: never
	export const publicEncrypt: never
	export const publicDecrypt: never
	export const privateDecrypt: never
	export const privateEncrypt: never
	export const getCiphers: never
	export const getHashes: never
	export const getCurves: never
	export const getFips: never
	export const setFips: never
	export const getRandomValues: never
	export const Hash: never
	export const Hmac: never
	export const Sign: never
	export const Verify: never
	export const KeyObject: never
	export const Certificate: never
	export const ECDH: never
	export const DiffieHellman: never
	export const DiffieHellmanGroup: never
	export const Cipheriv: never
	export const Decipheriv: never
	export const webcrypto: never
	export const subtle: never
	export const crypto: never
	export const fips: never
	export const constants: never
}

/**
 * @deprecated node:fs is not available in CRE WASM workflows. It requires filesystem access that is not available in WebAssembly.
 * @see https://docs.chain.link/cre/concepts/typescript-wasm-runtime
 */
declare module 'node:fs' {
	export const readFile: never
	export const readFileSync: never
	export const writeFile: never
	export const writeFileSync: never
	export const appendFile: never
	export const appendFileSync: never
	export const readdir: never
	export const readdirSync: never
	export const mkdir: never
	export const mkdirSync: never
	export const mkdtemp: never
	export const mkdtempSync: never
	export const rm: never
	export const rmSync: never
	export const rmdir: never
	export const rmdirSync: never
	export const unlink: never
	export const unlinkSync: never
	export const stat: never
	export const statSync: never
	export const lstat: never
	export const lstatSync: never
	export const fstat: never
	export const fstatSync: never
	export const statfs: never
	export const statfsSync: never
	export const exists: never
	export const existsSync: never
	export const copyFile: never
	export const copyFileSync: never
	export const cp: never
	export const cpSync: never
	export const rename: never
	export const renameSync: never
	export const readlink: never
	export const readlinkSync: never
	export const symlink: never
	export const symlinkSync: never
	export const link: never
	export const linkSync: never
	export const open: never
	export const openSync: never
	export const close: never
	export const closeSync: never
	export const read: never
	export const readSync: never
	export const write: never
	export const writeSync: never
	export const truncate: never
	export const truncateSync: never
	export const ftruncate: never
	export const ftruncateSync: never
	export const chmod: never
	export const chmodSync: never
	export const chown: never
	export const chownSync: never
	export const utimes: never
	export const utimesSync: never
	export const access: never
	export const accessSync: never
	export const createReadStream: never
	export const createWriteStream: never
	export const watch: never
	export const watchFile: never
	export const unwatchFile: never
	export const realpath: never
	export const realpathSync: never
	export const promises: never
	export const constants: never
	export const Dir: never
	export const Dirent: never
	export const Stats: never
	export const ReadStream: never
	export const WriteStream: never
	export const FileHandle: never
	export const FSWatcher: never
}

/**
 * @deprecated node:fs/promises is not available in CRE WASM workflows. It requires filesystem access that is not available in WebAssembly.
 * @see https://docs.chain.link/cre/concepts/typescript-wasm-runtime
 */
declare module 'node:fs/promises' {
	export const readFile: never
	export const writeFile: never
	export const appendFile: never
	export const readdir: never
	export const mkdir: never
	export const mkdtemp: never
	export const rm: never
	export const rmdir: never
	export const unlink: never
	export const stat: never
	export const lstat: never
	export const statfs: never
	export const copyFile: never
	export const cp: never
	export const rename: never
	export const readlink: never
	export const symlink: never
	export const link: never
	export const open: never
	export const truncate: never
	export const chmod: never
	export const chown: never
	export const utimes: never
	export const access: never
	export const realpath: never
	export const watch: never
	export const constants: never
	export const FileHandle: never
}

/**
 * @deprecated node:net is not available in CRE WASM workflows. It requires network access. Use cre.capabilities.HTTPClient instead.
 * @see https://docs.chain.link/cre/concepts/typescript-wasm-runtime
 */
declare module 'node:net' {
	export const createServer: never
	export const createConnection: never
	export const connect: never
	export const isIP: never
	export const isIPv4: never
	export const isIPv6: never
	export const getDefaultAutoSelectFamily: never
	export const setDefaultAutoSelectFamily: never
	export const Socket: never
	export const Server: never
	export const BlockList: never
	export const SocketAddress: never
}

/**
 * @deprecated node:http is not available in CRE WASM workflows. It requires network access. Use cre.capabilities.HTTPClient instead.
 * @see https://docs.chain.link/cre/concepts/typescript-wasm-runtime
 */
declare module 'node:http' {
	export const createServer: never
	export const request: never
	export const get: never
	export const validateHeaderName: never
	export const validateHeaderValue: never
	export const setMaxIdleHTTPParsers: never
	export const Server: never
	export const ClientRequest: never
	export const IncomingMessage: never
	export const ServerResponse: never
	export const OutgoingMessage: never
	export const Agent: never
	export const globalAgent: never
	export const METHODS: never
	export const STATUS_CODES: never
	export const maxHeaderSize: never
}

/**
 * @deprecated node:https is not available in CRE WASM workflows. It requires network access. Use cre.capabilities.HTTPClient instead.
 * @see https://docs.chain.link/cre/concepts/typescript-wasm-runtime
 */
declare module 'node:https' {
	export const createServer: never
	export const request: never
	export const get: never
	export const Server: never
	export const Agent: never
	export const globalAgent: never
}

/**
 * @deprecated node:child_process is not available in CRE WASM workflows. It requires OS process spawning that is not available in WebAssembly.
 * @see https://docs.chain.link/cre/concepts/typescript-wasm-runtime
 */
declare module 'node:child_process' {
	export const spawn: never
	export const spawnSync: never
	export const exec: never
	export const execSync: never
	export const execFile: never
	export const execFileSync: never
	export const fork: never
	export const ChildProcess: never
}

/**
 * @deprecated node:os is not available in CRE WASM workflows. It requires OS access that is not available in WebAssembly.
 * @see https://docs.chain.link/cre/concepts/typescript-wasm-runtime
 */
declare module 'node:os' {
	export const hostname: never
	export const platform: never
	export const arch: never
	export const type: never
	export const release: never
	export const version: never
	export const machine: never
	export const cpus: never
	export const availableParallelism: never
	export const freemem: never
	export const totalmem: never
	export const uptime: never
	export const loadavg: never
	export const homedir: never
	export const tmpdir: never
	export const userInfo: never
	export const networkInterfaces: never
	export const endianness: never
	export const getPriority: never
	export const setPriority: never
	export const EOL: never
	export const devNull: never
	export const constants: never
}

/**
 * @deprecated node:stream is not available in CRE WASM workflows. It requires native bindings that cannot run in WebAssembly.
 * @see https://docs.chain.link/cre/concepts/typescript-wasm-runtime
 */
declare module 'node:stream' {
	export const Readable: never
	export const Writable: never
	export const Duplex: never
	export const Transform: never
	export const PassThrough: never
	export const Stream: never
	export const pipeline: never
	export const finished: never
	export const promises: never
	export const addAbortSignal: never
	export const compose: never
	export const isErrored: never
	export const isReadable: never
}

/**
 * @deprecated node:worker_threads is not available in CRE WASM workflows. It requires threading support that is not available in WebAssembly.
 * @see https://docs.chain.link/cre/concepts/typescript-wasm-runtime
 */
declare module 'node:worker_threads' {
	export const Worker: never
	export const MessageChannel: never
	export const MessagePort: never
	export const BroadcastChannel: never
	export const isMainThread: never
	export const isInternalThread: never
	export const parentPort: never
	export const workerData: never
	export const threadId: never
	export const resourceLimits: never
	export const SHARE_ENV: never
	export const receiveMessageOnPort: never
	export const moveMessagePortToContext: never
	export const getEnvironmentData: never
	export const setEnvironmentData: never
	export const markAsUntransferable: never
	export const markAsUncloneable: never
	export const isMarkedAsUntransferable: never
	export const postMessageToThread: never
}

/**
 * @deprecated node:dns is not available in CRE WASM workflows. It requires network access that is not available in WebAssembly.
 * @see https://docs.chain.link/cre/concepts/typescript-wasm-runtime
 */
declare module 'node:dns' {
	export const lookup: never
	export const lookupService: never
	export const resolve: never
	export const resolve4: never
	export const resolve6: never
	export const resolveCname: never
	export const resolveMx: never
	export const resolveNs: never
	export const resolvePtr: never
	export const resolveSrv: never
	export const resolveTxt: never
	export const resolveNaptr: never
	export const resolveSoa: never
	export const resolveAny: never
	export const reverse: never
	export const setServers: never
	export const getServers: never
	export const setDefaultResultOrder: never
	export const getDefaultResultOrder: never
	export const promises: never
	export const Resolver: never
}

/**
 * @deprecated node:zlib is not available in CRE WASM workflows. It requires native compression bindings that cannot run in WebAssembly.
 * @see https://docs.chain.link/cre/concepts/typescript-wasm-runtime
 */
declare module 'node:zlib' {
	export const createGzip: never
	export const createGunzip: never
	export const createDeflate: never
	export const createInflate: never
	export const createDeflateRaw: never
	export const createInflateRaw: never
	export const createUnzip: never
	export const createBrotliCompress: never
	export const createBrotliDecompress: never
	export const createZstdCompress: never
	export const createZstdDecompress: never
	export const gzip: never
	export const gzipSync: never
	export const gunzip: never
	export const gunzipSync: never
	export const deflate: never
	export const deflateSync: never
	export const inflate: never
	export const inflateSync: never
	export const deflateRaw: never
	export const deflateRawSync: never
	export const inflateRaw: never
	export const inflateRawSync: never
	export const unzip: never
	export const unzipSync: never
	export const brotliCompress: never
	export const brotliCompressSync: never
	export const brotliDecompress: never
	export const brotliDecompressSync: never
	export const crc32: never
	export const constants: never
	export const Gzip: never
	export const Gunzip: never
	export const Deflate: never
	export const Inflate: never
	export const DeflateRaw: never
	export const InflateRaw: never
	export const Unzip: never
	export const BrotliCompress: never
	export const BrotliDecompress: never
	export const ZstdCompress: never
	export const ZstdDecompress: never
}
