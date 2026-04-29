use cre_wasm_exports::{__clear_registry, extend_wasm_exports};
use javy_plugin_api::{
    import_namespace,
    javy::{Runtime, quickjs::prelude::*},
    Config,
};

use javy_plugin_api::javy::quickjs::{
    ArrayBuffer, Ctx, Error, Exception, FromJs, TypedArray, Value,
};
use std::collections::HashMap;
use std::env;
use std::sync::{Mutex, OnceLock};
use base64::Engine;
use rand::{Rng, SeedableRng};
use rand_chacha::ChaCha8Rng;

static CURRENT_MODE: Mutex<i32> = Mutex::new(0);
static RANDOM_GENERATORS: OnceLock<Mutex<HashMap<i32, ChaCha8Rng>>> = OnceLock::new();

// ✅ Host imports: implemented in Go
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

    fn emit_metric(data_ptr: *const u8, data_len: i32) -> i32;
}

import_namespace!("javy_chainlink_sdk");

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
                return Err(Exception::throw_type(ctx, "Detached ArrayBuffer"));
            }
        }
        if let Ok(s) = String::from_js(ctx, v) {
            let decoded = base64::engine::general_purpose::STANDARD
                .decode(s.as_bytes())
                .map_err(|_| {
                    Exception::throw_type(
                        ctx,
                        "String input must be Base64 (Uint8Array/ArrayBuffer also allowed)",
                    )
                })?;
            return Ok(ArgBytes(decoded));
        }

        Err(Exception::throw_type(
            ctx,
            "Expected Uint8Array | ArrayBuffer | Base64 string",
        ))
    }
}

pub fn config() -> Config {
    let mut config = Config::default();
    config.event_loop(true).text_encoding(true).promise(true);
    config
}

/// Applies CRE plugin globals and host bindings. Used by the default plugin build and by generated host crates that add `--cre-exports` extensions.
///
/// Duplicate export names are caught eagerly by `extend_wasm_exports`.
pub fn modify_runtime(runtime: Runtime) -> Runtime {
    __clear_registry();
    runtime.context().with(|ctx| {
        RANDOM_GENERATORS.get_or_init(|| Mutex::new(HashMap::new()));

        extend_wasm_exports(
            &ctx,
            "callCapability",
            Func::from(|_ctx: Ctx<'_>, data: ArgBytes| {
                let req = data.0;
                let rc = unsafe { call_capability(req.as_ptr(), req.len() as i32) };
                Ok::<i64, Error>(rc)
            }),
        );

        extend_wasm_exports(
            &ctx,
            "awaitCapabilities",
            Func::from(|ctx: Ctx<'_>, req: ArgBytes, max_len: i32| {
                if max_len < 0 {
                    return Err(Exception::throw_range(&ctx, "maxLen < 0"));
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
                if n > max_len as i64 {
                    return Err(Error::new_into_js(
                        "Error",
                        "await_capabilities: host returned length exceeding buffer capacity",
                    ));
                }

                let out = &buf[..n as usize];
                Ok::<Vec<u8>, Error>(out.to_vec())
            }),
        );

        extend_wasm_exports(
            &ctx,
            "getSecrets",
            Func::from(|ctx: Ctx<'_>, req: ArgBytes, max_len: i32| {
                if max_len < 0 {
                    return Err(Exception::throw_range(&ctx, "maxLen < 0"));
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
                if n > max_len as i64 {
                    return Err(Error::new_into_js(
                        "Error",
                        "get_secrets: host returned length exceeding buffer capacity",
                    ));
                }

                let out = &buf[..n as usize];
                Ok::<Vec<u8>, Error>(out.to_vec())
            }),
        );

        extend_wasm_exports(
            &ctx,
            "awaitSecrets",
            Func::from(|ctx: Ctx<'_>, req: ArgBytes, max_len: i32| {
                if max_len < 0 {
                    return Err(Exception::throw_range(&ctx, "maxLen < 0"));
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
                if n > max_len as i64 {
                    return Err(Error::new_into_js(
                        "Error",
                        "await_secrets: host returned length exceeding buffer capacity",
                    ));
                }

                let out = &buf[..n as usize];
                Ok::<Vec<u8>, Error>(out.to_vec())
            }),
        );

        extend_wasm_exports(
            &ctx,
            "log",
            Func::from(|message: String| {
                let bytes = message.as_bytes();
                unsafe { log(bytes.as_ptr(), bytes.len() as i32) };
            }),
        );

        extend_wasm_exports(
            &ctx,
            "emitMetric",
            Func::from(|_ctx: Ctx<'_>, data: ArgBytes| {
                let bytes = data.0;
                let rc = unsafe { emit_metric(bytes.as_ptr(), bytes.len() as i32) };
                Ok::<i32, Error>(rc)
            }),
        );

        extend_wasm_exports(
            &ctx,
            "sendResponse",
            Func::from(|_ctx: Ctx<'_>, data: ArgBytes| {
                let bytes = data.0;
                let rc = unsafe { send_response(bytes.as_ptr(), bytes.len() as i32) };
                if rc == 0 {
                    std::process::exit(0);
                }
                Ok::<i32, Error>(rc)
            }),
        );

        extend_wasm_exports(
            &ctx,
            "switchModes",
            Func::from(|mode: i32| {
                *CURRENT_MODE
                    .lock()
                    .expect("failed to lock CURRENT_MODE mutex in switchModes") = mode;
                unsafe { switch_modes(mode) };
            }),
        );

        extend_wasm_exports(
            &ctx,
            "versionV2",
            Func::from(|| {
                unsafe { version_v2_typescript() };
            }),
        );

        let math_value = ctx
            .globals()
            .get::<_, Value>("Math")
            .expect("failed to get global 'Math' object");
        let math_object = math_value
            .as_object()
            .expect("global 'Math' is not an object");
        math_object
            .set(
                "random",
                Func::from(|| {
                    let current_mode = *CURRENT_MODE
                        .lock()
                        .expect("failed to lock CURRENT_MODE mutex in Math.random");
                    let mut generators = RANDOM_GENERATORS
                        .get()
                        .expect("RANDOM_GENERATORS not initialized")
                        .lock()
                        .expect("failed to lock RANDOM_GENERATORS mutex");

                    if !generators.contains_key(&current_mode) {
                        let seed = unsafe { random_seed(current_mode) } as u64;
                        generators.insert(current_mode, ChaCha8Rng::seed_from_u64(seed));
                    }

                    let generator = generators
                        .get_mut(&current_mode)
                        .expect("no random generator found for current mode");
                    Ok::<f64, Error>(generator.gen_range(0.0..1.0))
                }),
            )
            .expect("failed to set 'Math.random' override");

        extend_wasm_exports(
            &ctx,
            "getWasiArgs",
            Func::from(|_ctx: Ctx<'_>| -> Result<String, Error> {
                let args: Vec<String> = env::args().collect();
                let args_json = serde_json::to_string(&args).map_err(|_| {
                    Error::new_into_js("Error", "Failed to serialize args to JSON")
                })?;
                Ok(args_json)
            }),
        );

        extend_wasm_exports(
            &ctx,
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
                    buffer[0], buffer[1], buffer[2], buffer[3], buffer[4], buffer[5], buffer[6],
                    buffer[7],
                ]);

                let milliseconds = nanoseconds / 1_000_000;
                Ok(milliseconds as f64)
            }),
        );
    });

    runtime
}

