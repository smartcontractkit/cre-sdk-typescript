//! `cre_wasm_exports` — utilities for registering WASM exports with duplicate detection.
//!
//! Use `extend_wasm_exports(ctx, name, value)` instead of `ctx.globals().set(name, value)`
//! to track exports and detect duplicates at runtime.

use std::cell::RefCell;
use std::collections::HashMap;

use javy_plugin_api::javy::quickjs::{Ctx, IntoJs};

thread_local! {
    static REGISTERED: RefCell<HashMap<&'static str, usize>> = RefCell::new(HashMap::new());
}

/// Resets the registry. Call at the start of each initialization run.
pub fn reset_registry() {
    REGISTERED.with(|cell| {
        cell.borrow_mut().clear();
    });
}

fn track_export(name: &'static str) {
    REGISTERED.with(|cell| {
        let mut map = cell.borrow_mut();
        *map.entry(name).or_insert(0) += 1;
    });
}

/// Panics if any export was registered more than once, with a descriptive message.
/// Call this after all extensions have registered their exports.
pub fn check_duplicates() {
    REGISTERED.with(|cell| {
        let map = cell.borrow();
        let duplicates: Vec<_> = map.iter().filter(|(_, count)| **count > 1).collect();
        if !duplicates.is_empty() {
            let msg = duplicates
                .iter()
                .map(|(name, count)| format!("'{}' registered {} times", name, count))
                .collect::<Vec<_>>()
                .join(", ");
            panic!("Duplicate WASM exports: {}", msg);
        }
    });
}

/// Registers a JS global and tracks it for duplicate detection.
///
/// Same as `ctx.globals().set(name, value)` but also records the name
/// so that `check_duplicates()` can catch collisions.
pub fn extend_wasm_exports<'js, V: IntoJs<'js>>(ctx: &Ctx<'js>, name: &'static str, value: V) {
    ctx.globals().set(name, value).unwrap();
    track_export(name);
}
