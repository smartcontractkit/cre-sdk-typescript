use cre_wasm_exports::extend_wasm_exports;
use javy_plugin_api::javy::quickjs::prelude::*;
use javy_plugin_api::javy::quickjs::{Ctx, Object};

pub fn register(ctx: &Ctx<'_>) {
    let obj = Object::new(ctx.clone()).unwrap();
    obj.set(
        "greet",
        Func::from(|| -> String { "Hello from beta".to_string() }),
    )
    .unwrap();
    extend_wasm_exports(ctx, "rustBeta", obj);
}
