// Restricted Node.js modules that are not available in CRE WASM workflows.
// These modules require native bindings or system access that cannot run in WebAssembly.
// Importing from these modules will produce a TypeScript error at development time,
// preventing cryptic WASM runtime failures.

/** @deprecated node:crypto is not available in CRE WASM workflows. It requires native bindings that cannot run in WebAssembly. */
declare module 'node:crypto' {}

/** @deprecated node:fs is not available in CRE WASM workflows. It requires filesystem access that is not available in WebAssembly. */
declare module 'node:fs' {}

/** @deprecated node:fs/promises is not available in CRE WASM workflows. It requires filesystem access that is not available in WebAssembly. */
declare module 'node:fs/promises' {}

/** @deprecated node:net is not available in CRE WASM workflows. It requires network access. Use cre.capabilities.HTTPClient instead. */
declare module 'node:net' {}

/** @deprecated node:http is not available in CRE WASM workflows. It requires network access. Use cre.capabilities.HTTPClient instead. */
declare module 'node:http' {}

/** @deprecated node:https is not available in CRE WASM workflows. It requires network access. Use cre.capabilities.HTTPClient instead. */
declare module 'node:https' {}

/** @deprecated node:child_process is not available in CRE WASM workflows. It requires OS process spawning that is not available in WebAssembly. */
declare module 'node:child_process' {}

/** @deprecated node:os is not available in CRE WASM workflows. It requires OS access that is not available in WebAssembly. */
declare module 'node:os' {}

/** @deprecated node:stream is not available in CRE WASM workflows. It requires native bindings that cannot run in WebAssembly. */
declare module 'node:stream' {}

/** @deprecated node:worker_threads is not available in CRE WASM workflows. It requires threading support that is not available in WebAssembly. */
declare module 'node:worker_threads' {}

/** @deprecated node:dns is not available in CRE WASM workflows. It requires network access that is not available in WebAssembly. */
declare module 'node:dns' {}

/** @deprecated node:zlib is not available in CRE WASM workflows. It requires native compression bindings that cannot run in WebAssembly. */
declare module 'node:zlib' {}
