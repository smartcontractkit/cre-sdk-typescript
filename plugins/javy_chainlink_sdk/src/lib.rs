use javy_plugin_api::{
    import_namespace,
    javy::quickjs::prelude::*,
    Config,
};

use javy_plugin_api::javy::quickjs::Error;
use std::env;
use base64::Engine;

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
    fn version_v2();
    
    // Random seed generation
    fn random_seed(mode: i32) -> i64;
}

import_namespace!("javy_chainlink_sdk");

#[unsafe(no_mangle)]
pub unsafe extern "C" fn initialize_runtime() {
    let mut config = Config::default();
    config
        .event_loop(true)
        .text_encoding(true)
        .promise(true);

    javy_plugin_api::initialize_runtime(config, |runtime| {
        runtime.context().with(|ctx| {
            // Bind JS global: callCapability()
            ctx.globals()
                .set(
                    "callCapability",
                    Func::from(|_ctx: Ctx<'_>, request: String| {
                        // Decode base64 request to get original binary data
                        let request_bytes = match base64::engine::general_purpose::STANDARD.decode(&request) {
                            Ok(bytes) => bytes,
                            Err(_) => {
                                // Fallback to UTF-8 for backward compatibility with simple string requests
                                request.as_bytes().to_vec()
                            }
                        };
                        let request_len = request_bytes.len() as i32;
                        
                        let result = unsafe {
                            call_capability(request_bytes.as_ptr(), request_len)
                        };
                        
                        Ok::<i64, Error>(result)
                    }),
                )
                .unwrap();

            // Bind JS global: awaitCapabilities()
            ctx.globals()
                .set(
                    "awaitCapabilities",
                    Func::from(|_ctx: Ctx<'_>, await_request: String, max_response_len: i32| {
                        // Decode base64 request to get original binary data
                        let await_request_bytes = match base64::engine::general_purpose::STANDARD.decode(&await_request) {
                            Ok(bytes) => bytes,
                            Err(_) => {
                                // Fallback to UTF-8 for backward compatibility with simple string requests
                                await_request.as_bytes().to_vec()
                            }
                        };
                        let await_request_len = await_request_bytes.len() as i32;
                        let mut response_buffer = vec![0u8; max_response_len as usize];
                        
                        let bytes_written = unsafe {
                            await_capabilities(
                                await_request_bytes.as_ptr(),
                                await_request_len,
                                response_buffer.as_mut_ptr(),
                                max_response_len
                            )
                        };
                        
                        if bytes_written < 0 {
                            return Err(Error::new_into_js("Error", "await_capabilities failed"));
                        }
                        
                        // Convert binary data to base64 string for JS
                        let response_bytes = response_buffer[..bytes_written as usize].to_vec();
                        let base64_response = base64::engine::general_purpose::STANDARD.encode(response_bytes);
                        
                        Ok(base64_response)
                    }),
                )
                .unwrap();

            // Bind JS global: getSecrets()
            ctx.globals()
                .set(
                    "getSecrets",
                    Func::from(|_ctx: Ctx<'_>, request: String, max_response_len: i32| {
                        let request_bytes = request.as_bytes();
                        let request_len = request_bytes.len() as i32;
                        
                        let mut response_buffer = vec![0u8; max_response_len as usize];
                        
                        let result = unsafe {
                            get_secrets(
                                request_bytes.as_ptr(),
                                request_len,
                                response_buffer.as_mut_ptr(),
                                max_response_len
                            )
                        };
                        
                        Ok::<i64, Error>(result)
                    }),
                )
                .unwrap();

            // Bind JS global: awaitSecrets()
            ctx.globals()
                .set(
                    "awaitSecrets",
                    Func::from(|_ctx: Ctx<'_>, await_request: String, max_response_len: i32| {
                        // Decode base64 request to get original binary data
                        let await_request_bytes = match base64::engine::general_purpose::STANDARD.decode(&await_request) {
                            Ok(bytes) => bytes,
                            Err(_) => {
                                // Fallback to UTF-8 for backward compatibility with simple string requests
                                await_request.as_bytes().to_vec()
                            }
                        };
                        let await_request_len = await_request_bytes.len() as i32;
                        
                        let mut response_buffer = vec![0u8; max_response_len as usize];
                        
                        let bytes_written = unsafe {
                            await_secrets(
                                await_request_bytes.as_ptr(),
                                await_request_len,
                                response_buffer.as_mut_ptr(),
                                max_response_len
                            )
                        };
                        
                        if bytes_written < 0 {
                            return Err(Error::new_into_js("Error", "await_secrets failed"));
                        }
                        
                        // Convert binary data to base64 string for JS
                        let response_bytes = response_buffer[..bytes_written as usize].to_vec();
                        let base64_response = base64::engine::general_purpose::STANDARD.encode(response_bytes);
                        
                        Ok(base64_response)
                    }),
                )
                .unwrap();

            // Bind JS global: log()
            ctx.globals()
                .set(
                    "log",
                    Func::from(|message: String| {
                        let message_bytes = message.as_bytes();
                        let message_len = message_bytes.len() as i32;
                        
                        unsafe {
                            log(message_bytes.as_ptr(), message_len);
                        }
                    }),
                )
                .unwrap();

            // Bind JS global: sendResponse()
            ctx.globals()
                .set(
                    "sendResponse",
                    Func::from(|_ctx: Ctx<'_>, response: String| {
                        // Decode base64 response to get original binary data
                        let response_bytes = match base64::engine::general_purpose::STANDARD.decode(&response) {
                            Ok(bytes) => bytes,
                            Err(_) => {
                                // Fallback to UTF-8 for backward compatibility with simple string responses
                                response.as_bytes().to_vec()
                            }
                        };
                        let response_len = response_bytes.len() as i32;
                        
                        let result = unsafe {
                            send_response(response_bytes.as_ptr(), response_len)
                        };

                        if result == 0 {
                            // tell WASI to exit(0) → host sees success and returns exec.response
                            std::process::exit(0);
                        }

                        // non-zero -> propagate as-is                        
                        Ok::<i32, Error>(result)
                    }),
                )
                .unwrap();

            // Bind JS global: switchModes()
            ctx.globals()
                .set(
                    "switchModes",
                    Func::from(|mode: i32| {
                        unsafe {
                            switch_modes(mode);
                        }
                    }),
                )
                .unwrap();

            // Bind JS global: versionV2()
            ctx.globals()
                .set(
                    "versionV2",
                    Func::from(|| {
                        unsafe {
                            version_v2();
                        }
                    }),
                )
                .unwrap();

            // Bind JS global: randomSeed()
            ctx.globals()
                .set(
                    "randomSeed",
                    Func::from(|mode: i32| {
                        let result = unsafe {
                            random_seed(mode)
                        };
                        
                        Ok::<i64, Error>(result)
                    }),
                )
                .unwrap();

            // Bind JS global: getWasiArgs()
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
        });

        runtime
    })
    .unwrap();
}