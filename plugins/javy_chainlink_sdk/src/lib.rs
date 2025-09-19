use javy_plugin_api::{
    import_namespace,
    javy::quickjs::prelude::*,
    Config,
};

use javy_plugin_api::javy::quickjs::{
    ArrayBuffer, Ctx, Error, FromJs, TypedArray, Value,
};
use std::env;
use std::collections::HashMap;
use base64::Engine;
use rand::{Rng, SeedableRng};
use rand_chacha::ChaCha8Rng;

// ✅ Host imports: implemented in Go
#[link(wasm_import_module = "env")]
unsafe extern "C" {
    // Core capability communication
    fn call_capability(req_ptr: *const u8, req_len: i32) -> i64;
    fn await_capabilities(await_request_ptr: *const u8, await_request_len: i32, response_buffer_ptr: *mut u8, max_response_len: i32) -> i64;

    // Secrets management
    fn get_secrets(req_ptr: *const u8, req_len: i32, response_buffer_ptr: *mut u8, max_response_len: i32) -> i64;
    fn await_secrets(await_request_ptr: *const u8, await_request_len: i32, response_buffer_ptr: *mut u8, max_response_len: i32) -> i64;

    // Logging and response
    fn log(message_ptr: *const u8, message_len: i32);
    fn send_response(response_ptr: *const u8, response_len: i32) -> i32;

    // Mode switching and versioning
    fn switch_modes(mode: i32);
    fn version_v2_typescript();

    // Random seed generation
    fn random_seed(mode: i32) -> i64;

    // Getting now time
    fn now(result_timestamp: *mut u8) -> i32;
}

import_namespace!("javy_chainlink_sdk");

/// Accepts Uint8Array, ArrayBuffer, or Base64 string → bytes
struct ArgBytes(Vec<u8>);

impl<'js> FromJs<'js> for ArgBytes {
    fn from_js(ctx: &Ctx<'js>, v: Value<'js>) -> Result<Self, Error> {
        // Uint8Array<u8>
        if let Ok(ta) = TypedArray::<u8>::from_js(ctx, v.clone()) {
            let slice: &[u8] = ta.as_ref();
            return Ok(ArgBytes(slice.to_vec()));
        }
        // ArrayBuffer
        if let Ok(ab) = ArrayBuffer::from_js(ctx, v.clone()) {
            if let Some(bytes) = ab.as_bytes() {
                return Ok(ArgBytes(bytes.to_vec()));
            } else {
                return Err(Error::new_into_js("TypeError", "Detached ArrayBuffer"));
            }
        }
        // Base64 string
        if let Ok(s) = String::from_js(ctx, v) {
            let decoded = base64::engine::general_purpose::STANDARD
                .decode(s.as_bytes())
                .map_err(|_| Error::new_into_js(
                    "TypeError",
                    "String input must be Base64 (Uint8Array/ArrayBuffer also allowed)",
                ))?;
            return Ok(ArgBytes(decoded));
        }

        Err(Error::new_into_js(
            "TypeError",
            "Expected Uint8Array | ArrayBuffer | Base64 string",
        ))
    }
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn initialize_runtime() {
    let mut config = Config::default();
    config
        .event_loop(true)
        .text_encoding(true)
        .promise(true);

    javy_plugin_api::initialize_runtime(config, |runtime| {
        runtime.context().with(|ctx| {
            static mut CURRENT_MODE: i32 = 0;
            static mut RANDOM_GENERATORS: Option<HashMap<i32, ChaCha8Rng>> = None;
            unsafe { RANDOM_GENERATORS = Some(HashMap::new()); }
            

            // callCapability(data: Uint8Array | ArrayBuffer | Base64 string) -> i64
            ctx.globals()
                .set(
                    "callCapability",
                    Func::from(|_ctx: Ctx<'_>, data: ArgBytes| {
                        let req = data.0;
                        let rc = unsafe { call_capability(req.as_ptr(), req.len() as i32) };
                        Ok::<i64, Error>(rc)
                    }),
                )
                .unwrap();

            // awaitCapabilities(req, maxLen) -> Uint8Array (via IntoJs<Vec<u8>>)
            ctx.globals()
                .set(
                    "awaitCapabilities",
                    Func::from(|_ctx: Ctx<'_>, req: ArgBytes, max_len: i32| {
                        if max_len < 0 {
                            return Err(Error::new_into_js("RangeError", "maxLen < 0"));
                        }
                        let req_bytes = req.0;
                        let mut buf = vec![0u8; max_len as usize];

                        let n = unsafe {
                            await_capabilities(
                                req_bytes.as_ptr(),
                                req_bytes.len() as i32,
                                buf.as_mut_ptr(),
                                max_len,
                            )
                        };
                        if n < 0 {
                            return Err(Error::new_into_js("Error", "await_capabilities failed"));
                        }

                        let out = &buf[..n as usize];
                        Ok::<Vec<u8>, Error>(out.to_vec())
                    }),
                )
                .unwrap();

            // getSecrets(req, maxLen) -> Uint8Array (via IntoJs<Vec<u8>>)
            ctx.globals()
                .set(
                    "getSecrets",
                    Func::from(|_ctx: Ctx<'_>, req: ArgBytes, max_len: i32| {
                        if max_len < 0 {
                            return Err(Error::new_into_js("RangeError", "maxLen < 0"));
                        }
                        let req_bytes = req.0;
                        let mut buf = vec![0u8; max_len as usize];

                        let n = unsafe {
                            get_secrets(
                                req_bytes.as_ptr(),
                                req_bytes.len() as i32,
                                buf.as_mut_ptr(),
                                max_len,
                            )
                        };
                        if n < 0 {
                            return Err(Error::new_into_js("Error", "get_secrets failed"));
                        }

                        let out = &buf[..n as usize];
                        Ok::<Vec<u8>, Error>(out.to_vec())
                    }),
                )
                .unwrap();

            // awaitSecrets(req, maxLen) -> Uint8Array (via IntoJs<Vec<u8>>)
            ctx.globals()
                .set(
                    "awaitSecrets",
                    Func::from(|_ctx: Ctx<'_>, req: ArgBytes, max_len: i32| {
                        if max_len < 0 {
                            return Err(Error::new_into_js("RangeError", "maxLen < 0"));
                        }
                        let req_bytes = req.0;
                        let mut buf = vec![0u8; max_len as usize];

                        let n = unsafe {
                            await_secrets(
                                req_bytes.as_ptr(),
                                req_bytes.len() as i32,
                                buf.as_mut_ptr(),
                                max_len,
                            )
                        };
                        if n < 0 {
                            return Err(Error::new_into_js("Error", "await_secrets failed"));
                        }

                        let out = &buf[..n as usize];
                        Ok::<Vec<u8>, Error>(out.to_vec())
                    }),
                )
                .unwrap();

            // log(message: string)
            ctx.globals()
                .set(
                    "log",
                    Func::from(|message: String| {
                        let bytes = message.as_bytes();
                        unsafe { log(bytes.as_ptr(), bytes.len() as i32) };
                    }),
                )
                .unwrap();

            // sendResponse(data: Uint8Array | ArrayBuffer | Base64 string) -> i32 (exits on rc==0)
            ctx.globals()
                .set(
                    "sendResponse",
                    Func::from(|_ctx: Ctx<'_>, data: ArgBytes| {
                        let bytes = data.0;
                        let rc = unsafe { send_response(bytes.as_ptr(), bytes.len() as i32) };
                        if rc == 0 {
                            std::process::exit(0);
                        }
                        Ok::<i32, Error>(rc)
                    }),
                )
                .unwrap();

            // switchModes(mode: number)
            ctx.globals()
                .set(
                    "switchModes",
                    Func::from(|mode: i32| {
                        unsafe { 
                            CURRENT_MODE = mode;
                            switch_modes(mode);
                        };
                    }),
                )
                .unwrap();

            // versionV2(): void
            ctx.globals()
                .set(
                    "versionV2",
                    Func::from(|| {
                        unsafe { version_v2_typescript() };
                    }),
                )
                .unwrap();

            // Override Math.random to use mode-based seeded generators
            let math_value = ctx.globals().get::<_, Value>("Math").unwrap();
            let math_object = math_value.as_object().unwrap();
            math_object.set("random", Func::from(|| {
                unsafe {
                    let generators = (*std::ptr::addr_of_mut!(RANDOM_GENERATORS)).as_mut().unwrap();
                    let current_mode = *std::ptr::addr_of!(CURRENT_MODE);
                    
                    // Get or create a generator for the current mode
                    if !generators.contains_key(&current_mode) {
                        let seed = random_seed(current_mode) as u64;
                        generators.insert(current_mode, ChaCha8Rng::seed_from_u64(seed));
                    }
                    
                    let generator = generators.get_mut(&current_mode).unwrap();
                    Ok::<f64, Error>(generator.gen_range(0.0..1.0))
                }
            })).unwrap();

            // getWasiArgs(): string (JSON array)
            ctx.globals()
                .set(
                    "getWasiArgs",
                    Func::from(|_ctx: Ctx<'_>| -> Result<String, Error> {
                        let args: Vec<String> = env::args().collect();
                        let args_json = serde_json::to_string(&args)
                            .map_err(|_| Error::new_into_js("Error", "Failed to serialize args to JSON"))?;
                        Ok(args_json)
                    }),
                )
                .unwrap();

            // now(): number (Unix timestamp in milliseconds)
            ctx.globals()
                .set(
                    "now",
                    Func::from(|_ctx: Ctx<'_>| -> Result<f64, Error> {
                        // Allocate 8-byte buffer for UnixNano timestamp
                        let mut buffer = vec![0u8; 8];
                        let rc = unsafe { now(buffer.as_mut_ptr()) };
                        
                        if rc != 0 {
                            return Err(Error::new_into_js(
                                "Error", 
                                "now() returned non-zero status"
                            ));
                        }
                        
                        // Read timestamp as little-endian uint64
                        let nanoseconds = u64::from_le_bytes([
                            buffer[0], buffer[1], buffer[2], buffer[3],
                            buffer[4], buffer[5], buffer[6], buffer[7],
                        ]);
                        
                        // Convert from nanoseconds to milliseconds
                        let milliseconds = nanoseconds / 1_000_000;
                        Ok(milliseconds as f64)
                    }),
                )
                .unwrap();
        });

        runtime
    })
    .unwrap();
}
