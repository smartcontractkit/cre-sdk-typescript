# CRE SDK Publishing Guide

This guide explains how to publish the CRE SDK packages with independent versioning.

## 🛠️ Foundations

Current release process is only half automated in a sense, there are dedicaed publishing actions for each of the two packages `@chainlink/cre-sdk-javy-plugin` and `@chainlink/cre-sdk`. Developer performinng the release is responsible for manually updating the versions and making sure `@chainlink/cre-sdk`'s `package.json` correctly reflects the version of the `@chainlink/cre-sdk-javy-plugin` it depends on.

** 🚨 IMPORTANT WARNING: **
** The process requires creating a tag for the release, you should not release directly from the `main` branch!**.

## 📦 Package Structure

- `@chainlink/cre-sdk-javy-plugin` - Javy plugin (independent)
- `@chainlink/cre-sdk` - Main SDK (requires javy plugin)

## 🚀 Publishing Process

There are 2 possible scenarios that you might encounter:

1. You are updating both the `@chainlink/cre-sdk` and the `@chainlink/cre-sdk-javy-plugin`.
2. You are updating just the `@chainlink/cre-sdk` without the need of updating `@chainlink/cre-sdk-javy-plugin`.

Below ale the steps for two scenarios.

### 1. Both packages need an update

1. Create a new branch from `main` with the name `release-candidate-vx.y.z` (for example `release-candidate-v1.0.8`).
2. Update the version of the `@chainlink/cre-sdk-javy-plugin` in [packages/cre-sdk-javy-plugin/package.json](https://github.com/smartcontractkit/cre-sdk-typescript/blob/main/packages/cre-sdk-javy-plugin/package.json#L3) to the desired version (for example `1.0.8`, notice it does not include `v`).
3. Update the version of the `@chainlink/cre-sdk` in [packages/cre-sdk/package.json](https://github.com/smartcontractkit/cre-sdk-typescript/blob/main/packages/cre-sdk/package.json#L3) to the same version as the `@chainlink/cre-sdk-javy-plugin`.
4. Change the dependency on `@chainlink/cre-sdk-javy-plugin` in [packages/cre-sdk/package.json](https://github.com/smartcontractkit/cre-sdk-typescript/blob/main/packages/cre-sdk/package.json#L58) from `workspace:*` to the same version as the `@chainlink/cre-sdk-javy-plugin`.
   _Note: This should be the version you're aiming to publish, the same from step 2 of this instruction. It will get published before we actually publish the SDK itself._
5. Update the version of the `@chainlink/cre-sdk-examples` in [packages/cre-sdk-examples/package.json](https://github.com/smartcontractkit/cre-sdk-typescript/blob/main/packages/cre-sdk-examples/package.json#L3) to the same version as `@chainlink/cre-sdk`.
6. Update the dependency on `@chainlink/cre-sdk` in [packages/cre-sdk-examples/package.json](https://github.com/smartcontractkit/cre-sdk-typescript/blob/main/packages/cre-sdk-examples/package.json#L18) to the same version as `@chainlink/cre-sdk`.
7. Create a release and during the process create new tag that starts with `v` (following our example it would be: `v1.0.8`), based on the branch you created in step 1 (following our example it would be: example: `release-candidate-v1.0.8`).
   _Note: To autogenerate the release note first pick previous release tag in the GitHub UI and then click "autogenerate release notes" button._
8. After the release with the tag is created, go to GitHub Actions and start from the [publish-cre-sdk-javy-plugin.yml workflow](https://github.com/smartcontractkit/cre-sdk-typescript/actions/workflows/publish-cre-sdk-javy-plugin.yml) and release the Javy Plugin.
   _Note: In `Use workflow from` field keep `main` selected. In the `git tag` field put the name of tag you created (should start with `v`, following our example it would be: `v1.0.8`)._
9. After the Javy Plugin is published, go to GitHub Actions and start from the [publish-cre-sdk.yml workflow](https://github.com/smartcontractkit/cre-sdk-typescript/actions/workflows/publish-cre-sdk.yml) and release the SDK.
   _Note: In `Use workflow from` field keep `main` selected. In the `git tag` field put the name of tag you created (should start with `v`, following our example it would be: `v1.0.8`)._
10. Once the SDK is published cleanup the `relase-candidate-vx.y.z` branch (following our example we would need to delete the branch `release-candidate-v1.0.8`).
11. **🎉 Congratulations, you have released the new version of the CRE SDK!**

### 2. Only the SDK needs an update

This would mean we're releasing a new version of the `@chainlink/cre-sdk` without the need of updating the `@chainlink/cre-sdk-javy-plugin`. Plugin is less frequently updated and there's also no reasonable scenario where we would just update the plugin without updating the SDK.

1. Start by inspecting the last released tag or [npm registry](https://www.npmjs.com/package/@chainlink/cre-sdk-javy-plugin) of the `@chainlink/cre-sdk-javy-plugin` to confirm what is the latest version. For this instruction we'll assume the last released version of `@chainlink/cre-sdk-javy-plugin` is `1.0.2`.
2. Create a new branch from `main` with the name `release-candidate-vx.y.z`. For this instruction let's assume we want to release version `1.0.8`, so our branch should be named `release-candidate-v1.0.8`.
3. Update the version of the `@chainlink/cre-sdk` in [packages/cre-sdk/package.json](https://github.com/smartcontractkit/cre-sdk-typescript/blob/main/packages/cre-sdk/package.json#L3) to desired version (following our example it would be: `1.0.8`).
4. Change the dependency on `@chainlink/cre-sdk-javy-plugin` in [packages/cre-sdk/package.json](https://github.com/smartcontractkit/cre-sdk-typescript/blob/main/packages/cre-sdk/package.json#L58) from `workspace:*` to the last published version of the `@chainlink/cre-sdk-javy-plugin` we confirmed in step 1 (following our example it would be: `1.0.2`).
5. Update the version of the `@chainlink/cre-sdk-examples` in [packages/cre-sdk-examples/package.json](https://github.com/smartcontractkit/cre-sdk-typescript/blob/main/packages/cre-sdk-examples/package.json#L3) to the same version as `@chainlink/cre-sdk` (following our example it would be: `1.0.8`).
6. Update the dependency on `@chainlink/cre-sdk` in [packages/cre-sdk-examples/package.json](https://github.com/smartcontractkit/cre-sdk-typescript/blob/main/packages/cre-sdk-examples/package.json#L18) to the same version as `@chainlink/cre-sdk` (following our example it would be: `1.0.8`).
7. Create a release and during the process create new tag that starts with `v` (following our example it would be: `v1.0.8`), based on the branch you created in step 2 (following our example it would be: `release-candidate-v1.0.8`).
   _Note: To autogenerate the release note first pick previous release tag in the GitHub UI and then click "autogenerate release notes" button._
8. After the release with the tag is created, go to GitHub Actions and go directly to the [publish-cre-sdk.yml workflow](https://github.com/smartcontractkit/cre-sdk-typescript/actions/workflows/publish-cre-sdk.yml) and release the SDK.
   _Note: In `Use workflow from` field keep `main` selected. In the `git tag` field put the name of tag you created (should start with `v`, following our example it would be: `v1.0.8`)._
9. Once the SDK is published cleanup the `relase-candidate-vx.y.z` branch (following our example we would need to delete the branch `release-candidate-v1.0.8`).
10. **🎉 Congratulations, you have released the new version of the CRE SDK!**

## Pre-release (Alpha / Beta / RC)

The npm dist-tag is determined automatically from the version in `package.json`. Pre-release versions never overwrite the `latest` tag, so `bun add @chainlink/cre-sdk` always installs the last stable release.

| Version in `package.json` | npm dist-tag | Install command |
|---------------------------|-------------|-----------------|
| `1.1.3`                   | `latest`    | `bun add @chainlink/cre-sdk` |
| `1.1.3-alpha.1`           | `alpha`     | `bun add @chainlink/cre-sdk@alpha` |
| `1.1.3-beta.1`            | `beta`      | `bun add @chainlink/cre-sdk@beta` |
| `1.1.3-rc.1`              | `rc`        | `bun add @chainlink/cre-sdk@rc` |

### Publishing a pre-release

Follow the same steps as scenario 1 or 2 above, but use a pre-release version string:

1. Set version in `packages/cre-sdk/package.json` to e.g. `1.1.3-alpha.1`
2. Create the release branch, tag (e.g. `v1.1.3-alpha.1`), and trigger the publish workflow as usual
3. The workflow automatically detects the pre-release suffix and publishes with the correct dist-tag

### Promoting to stable

Once the pre-release has been validated:

1. Update `packages/cre-sdk/package.json` version to `1.1.3` (remove the pre-release suffix)
2. Follow the normal release process — the workflow will publish with `--tag latest`

## 🟡 capabilities-development continuous prereleases

The `capabilities-development` branch publishes a continuous prerelease line under the npm `cd` dist-tag. **No manual coordination is required** — every push to `capabilities-development` triggers `.github/workflows/cd-release.yml`, which:

1. Computes the next version by patch-bumping the highest existing `v*.*.*-cd` git tag.
2. Republishes `@chainlink/cre-sdk-javy-plugin` only if its source changed since the last cd release.
3. Pins `workspace:*` dependencies to the new concrete version inside the published tarball metadata.
4. Tags the release as `v0.0.N-cd` (without modifying the branch — the tag points at an ephemeral release commit).
5. Creates a GitHub prerelease with auto-generated notes.

### Version scheme

| Channel | Version pattern | Source | dist-tag |
|---|---|---|---|
| Stable | `1.6.0` | `main` via `publish-cre-sdk*.yml` | `latest` |
| Curated alpha / beta / rc | `1.6.1-alpha.1` etc. | release branches via `publish-cre-sdk*.yml` | `alpha` / `beta` / `rc` |
| Continuous capabilities-development | `0.0.N-cd` | `capabilities-development` via `cd-release.yml` | `cd` |

The cd line is intentionally rooted at `0.0.0` and only patch-bumps. Major / minor never advance — the cd line is alpha-quality and does not communicate semantic version meaning. Consumers should pin to specific versions (`0.0.7-cd`) for reproducibility, or use the `cd` dist-tag for "always latest dev":

```bash
bun add @chainlink/cre-sdk@cd
bun add @chainlink/cre-sdk@0.0.7-cd
```

### One-time seed

The cd line must be seeded once with the lowest tag the workflow should bump from:

```bash
git tag v0.0.0-cd
git push origin v0.0.0-cd
```

After that, the workflow runs hands-off. To restart the line at a new base (e.g., `v1.0.0-cd`) tag manually with the new base; the next automated run will continue from there.

### Guards

- **L1**: npm `latest` dist-tag is never assigned to cd versions because `npm publish --tag cd` is hard-coded in the workflow.
- **L2**: The workflow asserts the computed version ends in `-cd` and aborts if not.
- **L3**: The manual `publish-cre-sdk.yml` and `publish-cre-sdk-javy-plugin.yml` workflows reject any input tag matching `*-cd*`.

### Branch state

The `capabilities-development` branch is **never modified** by the workflow. `package.json` files always show `workspace:*`. Pinned versions exist only inside the ephemeral release commit that the git tag points to. To consume the released artifact verbatim, check out the tag:

```bash
git checkout v0.0.7-cd
cd packages/cre-sdk-examples
bun install   # resolves @chainlink/cre-sdk@0.0.7-cd from npm
```

### Re-run safety

If `cd-release.yml` runs again on the same commit (e.g., manual dispatch retry), it short-circuits when the current `HEAD` already has a `*-cd` tag. To force a re-publish, delete the tag locally and on origin first.
