use cre_wasm_exports::extend_wasm_exports;
use javy_plugin_api::javy::quickjs::prelude::*;
use javy_plugin_api::javy::quickjs::{ArrayBuffer, Ctx, Error, FromJs, TypedArray, Value};
use javy_plugin_api::javy::Runtime;
use std::collections::HashMap;
use std::env;

use base64::Engine;
use rand::{Rng, SeedableRng};
use rand_chacha::ChaCha8Rng;

// Host imports: implemented in Go
#[link(wasm_import_module = "env")]
unsafe extern "C" {
    fn call_capability(req_ptr: *const u8, req_len: i32) -> i64;
    fn await_capabilities(
        await_request_ptr: *const u8,
        await_request_len: i32,
        response_buffer_ptr: *mut u8,
        max_response_len: i32,
    ) -> i64;
    fn get_secrets(
        req_ptr: *const u8,
        req_len: i32,
        response_buffer_ptr: *mut u8,
        max_response_len: i32,
    ) -> i64;
    fn await_secrets(
        await_request_ptr: *const u8,
        await_request_len: i32,
        response_buffer_ptr: *mut u8,
        max_response_len: i32,
    ) -> i64;
    fn log(message_ptr: *const u8, message_len: i32);
    fn send_response(response_ptr: *const u8, response_len: i32) -> i32;
    fn switch_modes(mode: i32);
    fn version_v2_typescript();
    fn random_seed(mode: i32) -> i64;
    fn now(result_timestamp: *mut u8) -> i32;
}

/// Accepts Uint8Array, ArrayBuffer, or Base64 string → bytes
struct ArgBytes(Vec<u8>);

impl<'js> FromJs<'js> for ArgBytes {
    fn from_js(ctx: &Ctx<'js>, v: Value<'js>) -> Result<Self, Error> {
        if let Ok(ta) = TypedArray::<u8>::from_js(ctx, v.clone()) {
            let slice: &[u8] = ta.as_ref();
            return Ok(ArgBytes(slice.to_vec()));
        }
        if let Ok(ab) = ArrayBuffer::from_js(ctx, v.clone()) {
            if let Some(bytes) = ab.as_bytes() {
                return Ok(ArgBytes(bytes.to_vec()));
            } else {
                return Err(Error::new_into_js("TypeError", "Detached ArrayBuffer"));
            }
        }
        if let Ok(s) = String::from_js(ctx, v) {
            let decoded = base64::engine::general_purpose::STANDARD
                .decode(s.as_bytes())
                .map_err(|_| {
                    Error::new_into_js(
                        "TypeError",
                        "String input must be Base64 (Uint8Array/ArrayBuffer also allowed)",
                    )
                })?;
            return Ok(ArgBytes(decoded));
        }
        Err(Error::new_into_js(
            "TypeError",
            "Expected Uint8Array | ArrayBuffer | Base64 string",
        ))
    }
}

static mut CURRENT_MODE: i32 = 0;
static mut RANDOM_GENERATORS: Option<HashMap<i32, ChaCha8Rng>> = None;

/// Runtime-level setup: Math.random override, etc. Call before register.
pub fn setup_runtime(runtime: &Runtime) {
    unsafe {
        RANDOM_GENERATORS = Some(HashMap::new());
    }
    runtime.context().with(|ctx| {
        let math_value = ctx.globals().get::<_, Value>("Math").unwrap();
        let math_object = math_value.as_object().unwrap();
        math_object
            .set(
                "random",
                Func::from(|| {
                    unsafe {
                        let generators =
                            (*std::ptr::addr_of_mut!(RANDOM_GENERATORS)).as_mut().unwrap();
                        let current_mode = *std::ptr::addr_of!(CURRENT_MODE);
                        if !generators.contains_key(&current_mode) {
                            let seed = random_seed(current_mode) as u64;
                            generators.insert(current_mode, ChaCha8Rng::seed_from_u64(seed));
                        }
                        let generator = generators.get_mut(&current_mode).unwrap();
                        Ok::<f64, Error>(generator.gen_range(0.0..1.0))
                    }
                }),
            )
            .unwrap();
    });
}

/// Registers all SDK host bindings. Call after setup_runtime.
pub fn register(ctx: &Ctx<'_>) {
    extend_wasm_exports(
        ctx,
        "callCapability",
        Func::from(|_ctx: Ctx<'_>, data: ArgBytes| {
            let req = data.0;
            let rc = unsafe { call_capability(req.as_ptr(), req.len() as i32) };
            Ok::<i64, Error>(rc)
        })
    );

    extend_wasm_exports(
        ctx,
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
                let error_len = (-n) as usize;
                let error_msg =
                    String::from_utf8_lossy(&buf[..error_len.min(max_len as usize)]).into_owned();
                let error_msg_static: &'static str = Box::leak(error_msg.into_boxed_str());
                return Err(Error::new_into_js("Error", error_msg_static));
            }
            let out = &buf[..n as usize];
            Ok::<Vec<u8>, Error>(out.to_vec())
        })
    );

    extend_wasm_exports(
        ctx,
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
        })
    );

    extend_wasm_exports(
        ctx,
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
        })
    );

    extend_wasm_exports(
        ctx,
        "log",
        Func::from(|message: String| {
            let bytes = message.as_bytes();
            unsafe { log(bytes.as_ptr(), bytes.len() as i32) };
        })
    );

    extend_wasm_exports(
        ctx,
        "sendResponse",
        Func::from(|_ctx: Ctx<'_>, data: ArgBytes| {
            let bytes = data.0;
            let rc = unsafe { send_response(bytes.as_ptr(), bytes.len() as i32) };
            if rc == 0 {
                std::process::exit(0);
            }
            Ok::<i32, Error>(rc)
        })
    );

    extend_wasm_exports(
        ctx,
        "switchModes",
        Func::from(|mode: i32| {
            unsafe {
                CURRENT_MODE = mode;
                switch_modes(mode);
            };
        })
    );

    extend_wasm_exports(
        ctx,
        "versionV2",
        Func::from(|| {
            unsafe { version_v2_typescript() };
        })
    );

    extend_wasm_exports(
        ctx,
        "getWasiArgs",
        Func::from(|_ctx: Ctx<'_>| -> Result<String, Error> {
            let args: Vec<String> = env::args().collect();
            let args_json = serde_json::to_string(&args)
                .map_err(|_| Error::new_into_js("Error", "Failed to serialize args to JSON"))?;
            Ok(args_json)
        })
    );

    extend_wasm_exports(
        ctx,
        "now",
        Func::from(|_ctx: Ctx<'_>| -> Result<f64, Error> {
            let mut buffer = vec![0u8; 8];
            let rc = unsafe { now(buffer.as_mut_ptr()) };
            if rc != 0 {
                return Err(Error::new_into_js(
                    "Error",
                    "now() returned non-zero status",
                ));
            }
            let nanoseconds = u64::from_le_bytes([
                buffer[0], buffer[1], buffer[2], buffer[3],
                buffer[4], buffer[5], buffer[6], buffer[7],
            ]);
            let milliseconds = nanoseconds / 1_000_000;
            Ok(milliseconds as f64)
        })
    );
}
