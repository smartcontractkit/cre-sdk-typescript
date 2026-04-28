//! `cre_wasm_exports` — utilities for registering WASM exports with duplicate detection.
//!
//! Use `extend_wasm_exports(ctx, name, value)` instead of `ctx.globals().set(name, value)`
//! to track exports and detect duplicates at runtime.

use std::cell::RefCell;
use std::collections::HashSet;

use javy_plugin_api::javy::quickjs::{Ctx, IntoJs};

thread_local! {
    static REGISTERED: RefCell<HashSet<&'static str>> = RefCell::new(HashSet::new());
}

/// Registers a JS global and tracks it for duplicate detection.
///
/// Panics immediately if `name` was already registered in the current
/// initialization cycle (i.e. two different crates both export the same name).
pub fn extend_wasm_exports<'js, V: IntoJs<'js>>(ctx: &Ctx<'js>, name: &'static str, value: V) {
    REGISTERED.with(|cell| {
        let mut set = cell.borrow_mut();
        if !set.insert(name) {
            panic!("Duplicate WASM export: '{name}' is already registered");
        }
    });
    ctx.globals().set(name, value).unwrap();
}

/// Resets the export registry for a new initialization cycle.
///
/// **SDK-internal — do NOT call from extension code.** Calling this from an
/// extension would clear names registered by other crates, defeating
/// cross-extension duplicate detection.
///
/// Required because Javy's `init-plugin` invokes `initialize-runtime` twice on
/// the same thread (the upstream `javy_plugin_api::initialize_runtime` calls
/// `RUNTIME.take()` to permit re-init). The `thread_local!` `REGISTERED` set
/// outlives the old QuickJS `Runtime`, so without this clear the second pass
/// panics on every previously-registered name.
#[doc(hidden)]
pub fn __clear_registry() {
    REGISTERED.with(|cell| {
        cell.borrow_mut().clear();
    });
}

#[cfg(test)]
mod tests {
    use super::*;
    use javy_plugin_api::javy::{Config, Runtime};

    #[test]
    #[should_panic(expected = "Duplicate WASM export")]
    fn rejects_duplicate_export_name() {
        REGISTERED.with(|cell| cell.borrow_mut().clear());
        let runtime = Runtime::new(Config::default()).unwrap();
        runtime.context().with(|ctx| {
            extend_wasm_exports(&ctx, "duplicatedName", true);
            extend_wasm_exports(&ctx, "duplicatedName", true);
        });
    }
}
