# CRE SDK Publishing Guide

This guide explains how to publish the CRE SDK packages with independent versioning.

## 🔑 Secrets Required

Only **one** NPM token is needed:

- `NPM_CRE_SDK_TYPESCRIPT` - Token with publish permissions for `@chainlink/*` packages

## 📦 Package Structure

- `@chainlink/cre-sdk-javy-plugin` - Core compilation plugin (independent)
- `@chainlink/cre-sdk` - Main SDK (depends on javy-plugin)

## 🚀 Publishing Scenarios

### 1. Javy Plugin Only Update

When you only need to update the compilation plugin:

**GitHub Actions:**

```yaml
# Workflow: publish-cre-sdk-javy-plugin.yml
version: "1.0.1" # Specific version
version_type: "patch" # Or auto-increment
dry_run: false
```

### 2. SDK Only Update (Keep Existing Javy Plugin)

When SDK changes but javy plugin is unchanged:

**GitHub Actions:**

```yaml
# Workflow: publish-cre-sdk.yml
version: "2.0.0" # SDK version
javy_plugin_version: "1.0.1" # Use existing published version
update_javy_plugin: false # Don't update javy plugin
dry_run: false
```

### 3. Both Packages Update

When both packages need updates:

**GitHub Actions:**

```yaml
# Workflow: publish-cre-sdk.yml
version: "2.0.0" # SDK version
javy_plugin_version: "1.1.0" # New javy plugin version
update_javy_plugin: true # Update and publish javy plugin first
dry_run: false
```

### 4. Auto-Increment Versions

Let GitHub Actions bump versions automatically:

**GitHub Actions:**

```yaml
# Workflow: publish-cre-sdk.yml
# Leave version empty for auto-increment
version_type: "minor" # patch, minor, or major
update_javy_plugin: true # Also auto-increment javy plugin
dry_run: false
```

## 🧪 Local Testing

Use the dry-run script to test publishing locally:

```bash
# Test both packages with same version
./scripts/dry-run-publish.sh 1.0.0

# Test with different versions
./scripts/dry-run-publish.sh 2.0.0 1.0.1

# Test SDK only (skip javy plugin update)
./scripts/dry-run-publish.sh 2.0.0 1.0.0 false
```

## 📋 Publishing Workflow

### Option A: Independent Updates

1. **Update javy plugin first:**

   - Run `publish-cre-sdk-javy-plugin.yml`
   - Note the published version (e.g., `1.0.1`)

2. **Update SDK later:**
   - Run `publish-cre-sdk.yml`
   - Set `javy_plugin_version: "1.0.1"`
   - Set `update_javy_plugin: false`

### Option B: Coordinated Updates

1. **Update both at once:**
   - Run `publish-cre-sdk.yml`
   - Set both versions
   - Set `update_javy_plugin: true`

## ⚠️ Important Notes

1. **Version Dependencies**: SDK always uses `^X.Y.Z` for javy plugin dependency
2. **Workspace Resolution**: During publishing, `workspace:*` is replaced with actual version
3. **Build Order**: Turbo ensures javy plugin builds before SDK
4. **Rollback**: Original `package.json` is restored after publishing

## 🔍 Verification

Both workflows include verification steps:

- Package installation test
- CLI command availability check
- Dependency resolution verification

## 📊 Release Summary

GitHub Actions will create a summary showing:

- Which packages were published
- Version numbers used
- Dependency relationships
- Installation instructions

## 🎯 Best Practices

1. **Test locally first** with dry-run script
2. **Use dry_run: true** in GitHub Actions for testing
3. **Publish javy plugin first** if both need updates
4. **Use semantic versioning** (patch/minor/major)
5. **Document breaking changes** in release notes
