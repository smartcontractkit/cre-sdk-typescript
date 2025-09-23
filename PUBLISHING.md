# CRE SDK Publishing Guide

This guide explains how to publish the CRE SDK packages with independent versioning.

## 🔑 Secrets Required

Only **one** NPM token is needed:

- `NPM_CRE_SDK_TYPESCRIPT` - Token with publish permissions for `@chainlink/*` packages

## 📦 Package Structure

- `@chainlink/cre-sdk-javy-plugin` - Javy plugin (independent)
- `@chainlink/cre-sdk` - Main SDK (requires javy plugin)

## 🚀 Publishing Scenarios

### 1. Javy Plugin Update

You need to make sure `packages/cre-sdk-javy-plugin/package.json` has the correct version (e.g. `0.0.1`).
Then create a tag that starts with `v`, for example: `v0.0.1`.
Once the tag is created trigger GitHub Action: `publish-cre-sdk-javy-plugin.yml` manually and provide the tag name.

**GitHub Actions:**

```yaml
# Workflow: publish-cre-sdk-javy-plugin.yml
tag: "v0.0.1"
dry_run: false
```

### 2. SDK Update

You need to make sure `packages/cre-sdk-javy-plugin/package.json` has the correct version (e.g. `0.0.1`).
Then create a tag that starts with `v`, for example: `v0.0.1`.

SDK depends on the javy plugin. You would need to update your dependency on `@chainlink/cre-sdk-javy-plugin` to the version you want to use (example: `"@chainlink/cre-sdk-javy-plugin": "0.0.1"`).

If your tag will update both the javy plugin and the SDK, you would first need to run the GitHub Action: `publish-cre-sdk-javy-plugin.yml` and then follow up with `publish-cre-sdk.yml`.

**GitHub Actions:**

```yaml
# Workflow: publish-cre-sdk.yml
tag: "v0.0.1"
dry_run: false
```
