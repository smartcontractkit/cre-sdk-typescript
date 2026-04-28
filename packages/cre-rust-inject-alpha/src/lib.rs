use cre_wasm_exports::extend_wasm_exports;
use javy_plugin_api::javy::quickjs::prelude::*;
use javy_plugin_api::javy::quickjs::{Ctx, Object};

pub fn register(ctx: &Ctx<'_>) {
    let obj = Object::new(ctx.clone()).expect("failed to create rustAlpha export object");
    obj.set(
        "greet",
        Func::from(|| -> String { "Hello from alpha".to_string() }),
    )
    .expect("failed to set rustAlpha.greet export");
    extend_wasm_exports(ctx, "rustAlpha", obj);
}
