# cd-release helpers

Pure-function helpers used by `.github/workflows/cd-release.yml` to publish prereleases of `@chainlink/cre-sdk` and `@chainlink/cre-sdk-javy-plugin` under the npm `cd` dist-tag whenever code lands on `capabilities-development`.

Each helper is unit-tested with `bun test` and ships a thin CLI entry point so the workflow can shell out without embedding logic in YAML.

## `version.ts`

Computes the next cd version from existing git tags. Always patch-bumps from the highest `v*.*.*-cd` tag.

```bash
bun scripts/cd-release/version.ts
# → 0.0.7-cd
```

If no `*-cd` tag exists, exits non-zero with a seed instruction. Seed once manually:

```bash
git tag v0.0.0-cd
git push origin v0.0.0-cd
```

## `javy-changed.ts`

Returns `true` / `false` on stdout. `true` when the Javy plugin source differs from the supplied last-released cd tag, or when no prior cd javy version was passed.

```bash
bun scripts/cd-release/javy-changed.ts v0.0.6-cd
# → true   (or false)
```

## `pin-deps.ts`

Mutates a `package.json` in place: sets top-level `version`, replaces named `workspace:*` dependencies with concrete version strings.

```bash
bun scripts/cd-release/pin-deps.ts \
  packages/cre-sdk/package.json \
  0.0.7-cd \
  @chainlink/cre-sdk-javy-plugin=0.0.7-cd
```

Throws if a named dep is missing or is not a `workspace:*` entry — defensive against silent drift.

## Tests

```bash
cd scripts/cd-release
bun test
```
