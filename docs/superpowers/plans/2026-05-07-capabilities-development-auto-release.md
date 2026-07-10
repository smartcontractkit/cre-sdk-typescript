# Capabilities-Development Auto-Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automate prerelease publishes of `@chainlink/cre-sdk` and `@chainlink/cre-sdk-javy-plugin` to npm under the `cd` dist-tag every time code lands on the `capabilities-development` branch, with zero developer coordination per release.

**Architecture:** A new `cd-release.yml` GitHub Actions workflow fires on `push` to `capabilities-development`. It computes the next version from existing git tags (always patch-bump on the cd line), conditionally republishes the Javy plugin only when its source changed, pins `workspace:*` references in published package metadata at publish time, creates an ephemeral release commit / git tag (without modifying the branch), and creates a GitHub prerelease with auto-generated notes. The branch itself is never modified by CI.

**Tech Stack:** GitHub Actions, Bun (1.2.21+) with `bun test`, TypeScript scripts under `scripts/cd-release/`, `npm publish --tag cd`, `gh release create --prerelease`.

**Naming convention** (locked):
- Git tag: `v0.0.N-cd`
- npm version: `0.0.N-cd` (patch field is the counter; major/minor permanently `0.0`)
- npm dist-tag: `cd` (independent of `latest`, `alpha`, `beta`, `rc`)

**Guardrails** (locked):
- L1: SemVer suffix → npm regex auto-detects `cd` dist-tag (`-([a-zA-Z]+)`). `latest` never touched.
- L2: cd-release.yml asserts computed version ends in `-cd`; aborts otherwise.
- L3: Existing manual `publish-cre-sdk*.yml` workflows reject `*-cd*` input tags.

---

## File Structure

**New files:**
- `scripts/cd-release/version.ts` — pure version computation helper + CLI
- `scripts/cd-release/version.test.ts`
- `scripts/cd-release/javy-changed.ts` — javy diff detection helper + CLI
- `scripts/cd-release/javy-changed.test.ts`
- `scripts/cd-release/pin-deps.ts` — workspace:* → concrete version rewriter + CLI
- `scripts/cd-release/pin-deps.test.ts`
- `scripts/cd-release/README.md` — script reference
- `.github/workflows/cd-release.yml` — orchestrator workflow

**Modified files:**
- `.github/workflows/publish-cre-sdk.yml` — add L3 guard rejecting `*-cd*` tag input
- `.github/workflows/publish-cre-sdk-javy-plugin.yml` — add L3 guard rejecting `*-cd*` tag input
- `PUBLISHING.md` — document the cd release line

**Decomposition rationale:** The three helper scripts have distinct responsibilities (version math, git diff, JSON mutation). Splitting them keeps each unit testable in isolation with `bun test`. The workflow file orchestrates only — no business logic.

---

## Task 1: Bootstrap helper script directory and version computer

**Files:**
- Create: `scripts/cd-release/version.ts`
- Create: `scripts/cd-release/version.test.ts`

**Behavior**: `computeNextCdVersion(tags: string[]): string` finds the highest `v0.0.N-cd` tag, returns `0.0.(N+1)-cd`. If no tags match, throws — the cd line must be manually seeded (intentional: caller catches and surfaces a clear error to the operator).

- [ ] **Step 1: Write failing tests**

```typescript
// scripts/cd-release/version.test.ts
import { describe, expect, test } from "bun:test";
import { computeNextCdVersion } from "./version";

describe("computeNextCdVersion", () => {
	test("increments patch from highest cd tag", () => {
		const tags = ["v0.0.1-cd", "v0.0.2-cd", "v0.0.3-cd"];
		expect(computeNextCdVersion(tags)).toBe("0.0.4-cd");
	});

	test("ignores non-cd tags", () => {
		const tags = ["v1.6.0", "v0.0.1-cd", "v1.5.0", "v0.0.2-cd", "v1.6.1-alpha.1"];
		expect(computeNextCdVersion(tags)).toBe("0.0.3-cd");
	});

	test("uses semver ordering, not lexicographic", () => {
		const tags = ["v0.0.9-cd", "v0.0.10-cd", "v0.0.2-cd"];
		expect(computeNextCdVersion(tags)).toBe("0.0.11-cd");
	});

	test("throws if no cd tag has been seeded", () => {
		expect(() => computeNextCdVersion(["v1.6.0", "v1.6.1-alpha.1"])).toThrow(
			/cd line not seeded/i,
		);
	});

	test("throws on empty tag list", () => {
		expect(() => computeNextCdVersion([])).toThrow(/cd line not seeded/i);
	});
});
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `cd scripts/cd-release && bun test version.test.ts`
Expected: FAIL with "Cannot find module './version'" or similar.

- [ ] **Step 3: Implement minimal version**

```typescript
// scripts/cd-release/version.ts
const CD_TAG_REGEX = /^v(\d+)\.(\d+)\.(\d+)-cd$/;

export function computeNextCdVersion(tags: string[]): string {
	const cdTags = tags
		.map((t) => t.trim())
		.filter((t) => CD_TAG_REGEX.test(t))
		.map((t) => {
			const m = t.match(CD_TAG_REGEX);
			if (!m) throw new Error(`unreachable: ${t}`);
			return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) };
		});

	if (cdTags.length === 0) {
		throw new Error(
			"cd line not seeded: no tags matching v*.*.*-cd found. Seed manually with `git tag v0.0.0-cd && git push --tags`.",
		);
	}

	cdTags.sort((a, b) => {
		if (a.major !== b.major) return a.major - b.major;
		if (a.minor !== b.minor) return a.minor - b.minor;
		return a.patch - b.patch;
	});

	const top = cdTags[cdTags.length - 1];
	return `${top.major}.${top.minor}.${top.patch + 1}-cd`;
}

if (import.meta.main) {
	const { execSync } = await import("node:child_process");
	const tags = execSync("git tag -l 'v*-cd'", { encoding: "utf8" })
		.split("\n")
		.filter(Boolean);
	console.log(computeNextCdVersion(tags));
}
```

- [ ] **Step 4: Run tests to confirm pass**

Run: `cd scripts/cd-release && bun test version.test.ts`
Expected: 5 tests pass.

- [ ] **Step 5: Smoke-test the CLI against the live repo**

Run: `cd /Users/ishot/Documents/dev/smartcontract/cre-sdk-workspace/cre-sdk-typescript && bun scripts/cd-release/version.ts || true`
Expected: Either (a) prints `0.0.X-cd` if cd tags exist, or (b) errors with `cd line not seeded`. Both are acceptable — confirms the CLI executes.

- [ ] **Step 6: Commit**

```bash
git add scripts/cd-release/version.ts scripts/cd-release/version.test.ts
git commit -m "feat(cd-release): add version computer for cd dist-tag line"
```

---

## Task 2: Javy change detector

**Files:**
- Create: `scripts/cd-release/javy-changed.ts`
- Create: `scripts/cd-release/javy-changed.test.ts`

**Behavior:** `javyChangedSince(lastTag: string | null, runCommand: (cmd: string) => string): boolean` returns `true` if the Javy plugin source differs from the given last-released cd tag, OR if `lastTag` is `null` (no prior cd javy publish). Pure function — git access is injected via `runCommand` so tests stay hermetic.

- [ ] **Step 1: Write failing tests**

```typescript
// scripts/cd-release/javy-changed.test.ts
import { describe, expect, test } from "bun:test";
import { javyChangedSince } from "./javy-changed";

describe("javyChangedSince", () => {
	test("returns true when no prior cd javy version exists", () => {
		const result = javyChangedSince(null, () => {
			throw new Error("git should not be called when no prior version");
		});
		expect(result).toBe(true);
	});

	test("returns false when git diff reports no changes (exit 0)", () => {
		const result = javyChangedSince("v0.0.5-cd", (cmd) => {
			expect(cmd).toContain("git diff --quiet");
			expect(cmd).toContain("v0.0.5-cd");
			expect(cmd).toContain("packages/cre-sdk-javy-plugin");
			return "";
		});
		expect(result).toBe(false);
	});

	test("returns true when git diff reports changes (exit 1)", () => {
		const result = javyChangedSince("v0.0.5-cd", () => {
			const err = new Error("non-zero exit") as Error & { status: number };
			err.status = 1;
			throw err;
		});
		expect(result).toBe(true);
	});

	test("rethrows on unexpected git error (exit > 1)", () => {
		expect(() =>
			javyChangedSince("v0.0.5-cd", () => {
				const err = new Error("fatal: bad revision") as Error & { status: number };
				err.status = 128;
				throw err;
			}),
		).toThrow(/fatal: bad revision/);
	});
});
```

- [ ] **Step 2: Run tests, confirm failure**

Run: `cd scripts/cd-release && bun test javy-changed.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
// scripts/cd-release/javy-changed.ts
const JAVY_PATHS = [
	"packages/cre-sdk-javy-plugin/src",
	"packages/cre-sdk-javy-plugin/bin",
	"packages/cre-sdk-javy-plugin/scripts",
	"packages/cre-sdk-javy-plugin/package.json",
];

export function javyChangedSince(
	lastTag: string | null,
	runCommand: (cmd: string) => string,
): boolean {
	if (lastTag === null) return true;
	const paths = JAVY_PATHS.join(" ");
	try {
		runCommand(`git diff --quiet ${lastTag} HEAD -- ${paths}`);
		return false;
	} catch (err) {
		const status = (err as { status?: number }).status;
		if (status === 1) return true;
		throw err;
	}
}

if (import.meta.main) {
	const { execSync } = await import("node:child_process");
	const lastTag = process.argv[2] || null;
	const changed = javyChangedSince(lastTag === "" ? null : lastTag, (cmd) => {
		try {
			return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
		} catch (e) {
			const ex = e as { status?: number; stderr?: Buffer; message?: string };
			const wrapped = new Error(ex.stderr?.toString() ?? ex.message ?? "git error") as Error & {
				status?: number;
			};
			wrapped.status = ex.status;
			throw wrapped;
		}
	});
	console.log(changed ? "true" : "false");
}
```

- [ ] **Step 4: Run tests, confirm pass**

Run: `cd scripts/cd-release && bun test javy-changed.test.ts`
Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add scripts/cd-release/javy-changed.ts scripts/cd-release/javy-changed.test.ts
git commit -m "feat(cd-release): add javy plugin change detector"
```

---

## Task 3: Workspace dependency pinner

**Files:**
- Create: `scripts/cd-release/pin-deps.ts`
- Create: `scripts/cd-release/pin-deps.test.ts`

**Behavior:** `pinWorkspaceDeps(pkgJsonPath: string, options: { version: string; pinnedDeps: Record<string, string> }): void` reads the package.json at `pkgJsonPath`, sets its top-level `version` to `options.version`, and replaces every `dependencies[name] === "workspace:*"` (or `workspace:^`, `workspace:~`) listed in `options.pinnedDeps` with the supplied concrete version string. Other dependencies are untouched. Tabs/newlines preserved by re-emitting with `\t` indent + trailing newline (matches existing repo style).

- [ ] **Step 1: Write failing tests**

```typescript
// scripts/cd-release/pin-deps.test.ts
import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pinWorkspaceDeps } from "./pin-deps";

function makePkg(content: object): string {
	const dir = mkdtempSync(join(tmpdir(), "pin-test-"));
	const path = join(dir, "package.json");
	writeFileSync(path, `${JSON.stringify(content, null, "\t")}\n`);
	return path;
}

describe("pinWorkspaceDeps", () => {
	test("sets version and pins workspace:* dep", () => {
		const path = makePkg({
			name: "@chainlink/cre-sdk",
			version: "1.6.0",
			dependencies: {
				"@chainlink/cre-sdk-javy-plugin": "workspace:*",
				viem: "2.34.0",
			},
		});
		pinWorkspaceDeps(path, {
			version: "0.0.7-cd",
			pinnedDeps: { "@chainlink/cre-sdk-javy-plugin": "0.0.7-cd" },
		});
		const result = JSON.parse(readFileSync(path, "utf8"));
		expect(result.version).toBe("0.0.7-cd");
		expect(result.dependencies["@chainlink/cre-sdk-javy-plugin"]).toBe("0.0.7-cd");
		expect(result.dependencies.viem).toBe("2.34.0");
	});

	test("pins workspace:^ and workspace:~ variants", () => {
		const path = makePkg({
			name: "x",
			version: "0.0.0",
			dependencies: { a: "workspace:^", b: "workspace:~", c: "workspace:*" },
		});
		pinWorkspaceDeps(path, {
			version: "0.0.1-cd",
			pinnedDeps: { a: "0.0.1-cd", b: "0.0.1-cd", c: "0.0.1-cd" },
		});
		const result = JSON.parse(readFileSync(path, "utf8"));
		expect(result.dependencies).toEqual({ a: "0.0.1-cd", b: "0.0.1-cd", c: "0.0.1-cd" });
	});

	test("throws if a requested dep is not present in package.json", () => {
		const path = makePkg({ name: "x", version: "0.0.0", dependencies: {} });
		expect(() =>
			pinWorkspaceDeps(path, {
				version: "0.0.1-cd",
				pinnedDeps: { missing: "0.0.1-cd" },
			}),
		).toThrow(/missing/);
	});

	test("throws if a requested dep is not a workspace: protocol entry", () => {
		const path = makePkg({
			name: "x",
			version: "0.0.0",
			dependencies: { a: "1.2.3" },
		});
		expect(() =>
			pinWorkspaceDeps(path, {
				version: "0.0.1-cd",
				pinnedDeps: { a: "0.0.1-cd" },
			}),
		).toThrow(/not a workspace: dependency/);
	});

	test("preserves tab indentation and trailing newline", () => {
		const path = makePkg({
			name: "x",
			version: "0.0.0",
			dependencies: { a: "workspace:*" },
		});
		pinWorkspaceDeps(path, {
			version: "0.0.1-cd",
			pinnedDeps: { a: "0.0.1-cd" },
		});
		const text = readFileSync(path, "utf8");
		expect(text.endsWith("\n")).toBe(true);
		expect(text.includes("\t")).toBe(true);
	});
});
```

- [ ] **Step 2: Run tests, confirm failure**

Run: `cd scripts/cd-release && bun test pin-deps.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
// scripts/cd-release/pin-deps.ts
import { readFileSync, writeFileSync } from "node:fs";

type PackageJson = {
	version?: string;
	dependencies?: Record<string, string>;
	[key: string]: unknown;
};

export function pinWorkspaceDeps(
	pkgJsonPath: string,
	options: { version: string; pinnedDeps: Record<string, string> },
): void {
	const raw = readFileSync(pkgJsonPath, "utf8");
	const pkg = JSON.parse(raw) as PackageJson;

	pkg.version = options.version;

	for (const [name, target] of Object.entries(options.pinnedDeps)) {
		const current = pkg.dependencies?.[name];
		if (current === undefined) {
			throw new Error(`dependency '${name}' not found in ${pkgJsonPath}`);
		}
		if (!current.startsWith("workspace:")) {
			throw new Error(
				`dependency '${name}' in ${pkgJsonPath} is '${current}', not a workspace: dependency`,
			);
		}
		// biome-ignore lint/style/noNonNullAssertion: existence checked above
		pkg.dependencies![name] = target;
	}

	writeFileSync(pkgJsonPath, `${JSON.stringify(pkg, null, "\t")}\n`);
}

if (import.meta.main) {
	const [pkgPath, version, ...depPairs] = process.argv.slice(2);
	if (!pkgPath || !version) {
		console.error("usage: pin-deps.ts <package.json> <version> [<dep>=<ver> ...]");
		process.exit(2);
	}
	const pinnedDeps: Record<string, string> = {};
	for (const pair of depPairs) {
		const eq = pair.indexOf("=");
		if (eq < 0) {
			console.error(`invalid dep pair: ${pair}`);
			process.exit(2);
		}
		pinnedDeps[pair.slice(0, eq)] = pair.slice(eq + 1);
	}
	pinWorkspaceDeps(pkgPath, { version, pinnedDeps });
	console.log(`pinned ${pkgPath} → ${version}`);
}
```

- [ ] **Step 4: Run tests, confirm pass**

Run: `cd scripts/cd-release && bun test pin-deps.test.ts`
Expected: 5 tests pass.

- [ ] **Step 5: Run full helper test suite**

Run: `cd scripts/cd-release && bun test`
Expected: All Task 1, 2, 3 tests pass (14 total).

- [ ] **Step 6: Commit**

```bash
git add scripts/cd-release/pin-deps.ts scripts/cd-release/pin-deps.test.ts
git commit -m "feat(cd-release): add workspace dependency pinner"
```

---

## Task 4: Helper README

**Files:**
- Create: `scripts/cd-release/README.md`

- [ ] **Step 1: Write README**

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add scripts/cd-release/README.md
git commit -m "docs(cd-release): add helper script reference"
```

---

## Task 5: L3 guards on existing manual publish workflows

**Files:**
- Modify: `.github/workflows/publish-cre-sdk.yml`
- Modify: `.github/workflows/publish-cre-sdk-javy-plugin.yml`

**Behavior:** Both manual workflows reject input tags matching `*-cd*`. This prevents a human from accidentally publishing a cd-line tag through the main-line path (which would publish under the wrong dist-tag).

- [ ] **Step 1: Add guard step to `publish-cre-sdk.yml`**

Insert this step in `publish-cre-sdk.yml` immediately after the `Display checkout info` step (around line 51-55):

```yaml
      - name: Reject cd-line tags
        if: ${{ github.event.inputs.tag != '' }}
        run: |
          INPUT_TAG="${{ github.event.inputs.tag }}"
          if [[ "$INPUT_TAG" == *-cd* ]]; then
            echo "::error::Refusing to publish '$INPUT_TAG' through this workflow."
            echo "::error::cd-line tags must be published via cd-release.yml, not the main-line publish workflow."
            exit 1
          fi
```

- [ ] **Step 2: Add identical guard step to `publish-cre-sdk-javy-plugin.yml`**

Insert immediately after `Display checkout info` (around line 35-39).

- [ ] **Step 3: Lint workflow files**

Run: `bun x @action-validator/cli .github/workflows/publish-cre-sdk.yml .github/workflows/publish-cre-sdk-javy-plugin.yml || true`
Expected: No syntax errors. (Tool may not be installed; visually verify YAML structure if so.)

- [ ] **Step 4: Manually trace the guard logic**

Mentally walk through three cases for each workflow:
- Input tag `v1.6.1` → guard passes (no `-cd`), publishes normally.
- Input tag `v1.6.1-alpha.1` → guard passes (no `-cd`), publishes with alpha tag.
- Input tag `v0.0.5-cd` → guard fails, workflow exits 1. ✅

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/publish-cre-sdk.yml .github/workflows/publish-cre-sdk-javy-plugin.yml
git commit -m "chore(ci): block cd-line tags from main-line publish workflows"
```

---

## Task 6: cd-release.yml orchestrator workflow

**Files:**
- Create: `.github/workflows/cd-release.yml`

**Behavior:** On push to `capabilities-development`, executes the full release pipeline (Q11 ordering). On manual dispatch, supports a `dry_run` flag that performs everything except `npm publish`, `git push`, and `gh release create`.

- [ ] **Step 1: Write workflow file**

```yaml
name: cd Release (capabilities-development)

on:
  push:
    branches:
      - capabilities-development
    paths-ignore:
      - "**/*.md"
      - ".github/**"
  workflow_dispatch:
    inputs:
      dry_run:
        description: "Run without publishing or pushing tags"
        required: false
        default: false
        type: boolean

env:
  BUN_VERSION: "1.2.21"

concurrency:
  group: cd-release
  cancel-in-progress: false

jobs:
  cd-release:
    runs-on: ubuntu-latest
    permissions:
      contents: write       # for git tag push and gh release create
      id-token: write       # for npm provenance
    environment: Publish
    steps:
      - name: Checkout
        uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd # v6.0.2
        with:
          ref: ${{ github.ref }}
          fetch-depth: 0
          submodules: recursive

      - name: Configure git identity
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"

      - name: Re-run guard (skip if HEAD already published)
        run: |
          if git describe --exact-match --match 'v*-cd' HEAD 2>/dev/null; then
            echo "::notice::HEAD already has a cd tag; skipping."
            echo "SKIP=true" >> $GITHUB_ENV
          else
            echo "SKIP=false" >> $GITHUB_ENV
          fi

      - name: Setup Bun
        if: env.SKIP != 'true'
        uses: oven-sh/setup-bun@0c5077e51419868618aeaa5fe8019c62421857d6 # v2.2.0
        with:
          bun-version: ${{ env.BUN_VERSION }}

      - name: Setup Node.js for npm publish
        if: env.SKIP != 'true'
        uses: actions/setup-node@v4
        with:
          node-version: "24"
          registry-url: "https://registry.npmjs.org"

      - name: Update npm
        if: env.SKIP != 'true'
        run: npm install -g npm@latest

      - name: Compute next cd version
        if: env.SKIP != 'true'
        id: version
        run: |
          NEW_VERSION=$(bun scripts/cd-release/version.ts)
          echo "Computed next version: $NEW_VERSION"
          if [[ ! "$NEW_VERSION" =~ -cd$ ]]; then
            echo "::error::L2 guard tripped: version '$NEW_VERSION' does not end in -cd"
            exit 1
          fi
          echo "NEW_VERSION=$NEW_VERSION" >> $GITHUB_OUTPUT
          # also compute prior tag for release notes
          PRIOR_TAG=$(git tag -l 'v*-cd' | sort -V | tail -1)
          echo "PRIOR_TAG=$PRIOR_TAG" >> $GITHUB_OUTPUT

      - name: Install dependencies
        if: env.SKIP != 'true'
        run: bun install --frozen-lockfile

      - name: Run helper unit tests
        if: env.SKIP != 'true'
        working-directory: scripts/cd-release
        run: bun test

      - name: Decide whether javy needs republishing
        if: env.SKIP != 'true'
        id: javy
        run: |
          PRIOR="${{ steps.version.outputs.PRIOR_TAG }}"
          # query last published javy under cd dist-tag; empty string if none
          LAST_JAVY_CD=$(npm view @chainlink/cre-sdk-javy-plugin@cd version 2>/dev/null || true)
          echo "LAST_JAVY_CD=$LAST_JAVY_CD"
          if [ -z "$LAST_JAVY_CD" ]; then
            CHANGED=true
          else
            CHANGED=$(bun scripts/cd-release/javy-changed.ts "$PRIOR")
          fi
          echo "CHANGED=$CHANGED" >> $GITHUB_OUTPUT
          echo "LAST_JAVY_CD=$LAST_JAVY_CD" >> $GITHUB_OUTPUT

      - name: Publish javy plugin (if changed)
        if: env.SKIP != 'true' && steps.javy.outputs.CHANGED == 'true'
        working-directory: packages/cre-sdk-javy-plugin
        run: |
          NEW="${{ steps.version.outputs.NEW_VERSION }}"
          bun ../../scripts/cd-release/pin-deps.ts package.json "$NEW"
          if [ "${{ github.event.inputs.dry_run }}" = "true" ]; then
            npm publish --dry-run --access public --tag cd --verbose
          else
            npm publish --access public --tag cd --verbose
          fi

      - name: Resolve effective javy version for sdk pin
        if: env.SKIP != 'true'
        id: javyver
        run: |
          if [ "${{ steps.javy.outputs.CHANGED }}" = "true" ]; then
            echo "JAVY_VER=${{ steps.version.outputs.NEW_VERSION }}" >> $GITHUB_OUTPUT
          else
            echo "JAVY_VER=${{ steps.javy.outputs.LAST_JAVY_CD }}" >> $GITHUB_OUTPUT
          fi

      - name: Build cre-sdk
        if: env.SKIP != 'true'
        working-directory: packages/cre-sdk
        run: bun run build

      - name: Pin and publish cre-sdk
        if: env.SKIP != 'true'
        working-directory: packages/cre-sdk
        run: |
          NEW="${{ steps.version.outputs.NEW_VERSION }}"
          JAVY="${{ steps.javyver.outputs.JAVY_VER }}"
          bun ../../scripts/cd-release/pin-deps.ts package.json "$NEW" \
            "@chainlink/cre-sdk-javy-plugin=$JAVY"
          if [ "${{ github.event.inputs.dry_run }}" = "true" ]; then
            npm publish --dry-run --access public --tag cd --verbose
          else
            npm publish --access public --tag cd --verbose
          fi

      - name: Pin cre-sdk-examples (no publish)
        if: env.SKIP != 'true'
        working-directory: packages/cre-sdk-examples
        run: |
          NEW="${{ steps.version.outputs.NEW_VERSION }}"
          bun ../../scripts/cd-release/pin-deps.ts package.json "$NEW" \
            "@chainlink/cre-sdk=$NEW"

      - name: Create ephemeral release commit and tag
        if: env.SKIP != 'true'
        run: |
          NEW="${{ steps.version.outputs.NEW_VERSION }}"
          git add packages/cre-sdk/package.json \
                  packages/cre-sdk-examples/package.json \
                  packages/cre-sdk-javy-plugin/package.json
          git commit -m "chore(release): v${NEW} [skip ci]"
          git tag "v${NEW}"
          if [ "${{ github.event.inputs.dry_run }}" = "true" ]; then
            echo "DRY RUN: would push tag v${NEW}"
            git tag -d "v${NEW}"
          else
            git push origin "v${NEW}"
          fi

      - name: Create GitHub prerelease
        if: env.SKIP != 'true' && github.event.inputs.dry_run != 'true'
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          NEW="${{ steps.version.outputs.NEW_VERSION }}"
          PRIOR="${{ steps.version.outputs.PRIOR_TAG }}"
          gh release create "v${NEW}" \
            --prerelease \
            --latest=false \
            --generate-notes \
            --notes-start-tag "$PRIOR" \
            --title "v${NEW}"

      - name: Summary
        if: env.SKIP != 'true'
        run: |
          NEW="${{ steps.version.outputs.NEW_VERSION }}"
          {
            echo "## 🟡 cd Release v${NEW}"
            echo ""
            echo "- npm dist-tag: \`cd\`"
            echo "- javy republished: ${{ steps.javy.outputs.CHANGED }}"
            echo "- dry run: ${{ github.event.inputs.dry_run }}"
            echo ""
            echo "### Install"
            echo '```bash'
            echo "bun add @chainlink/cre-sdk@cd"
            echo "bun add @chainlink/cre-sdk@${NEW}"
            echo '```'
          } >> $GITHUB_STEP_SUMMARY
```

- [ ] **Step 2: Validate workflow YAML**

Run: `bun x @action-validator/cli .github/workflows/cd-release.yml || true`
Expected: No syntax errors. If validator unavailable, eyeball: every `if:` is correctly quoted, every `working-directory` is relative, every `${{ steps.X.outputs.Y }}` references a step that defines that output.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/cd-release.yml
git commit -m "feat(ci): add cd-release workflow for capabilities-development branch"
```

---

## Task 7: Update PUBLISHING.md to document the cd line

**Files:**
- Modify: `PUBLISHING.md`

- [ ] **Step 1: Append a new section after the "Promoting to stable" subsection**

Append the following at the end of `PUBLISHING.md`:

```markdown

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
```

- [ ] **Step 2: Commit**

```bash
git add PUBLISHING.md
git commit -m "docs: document capabilities-development cd release line"
```

---

## Task 8: Smoke test on a throwaway branch

**Files:** none (operational verification)

**Behavior:** Manually validate the workflow end-to-end in dry-run mode before any real publish.

- [ ] **Step 1: Push the implementation branch and seed cd tag**

```bash
git push origin <current-branch>
git tag v0.0.0-cd
git push origin v0.0.0-cd
```

- [ ] **Step 2: Trigger workflow_dispatch with dry_run=true**

Via GitHub UI or `gh`:

```bash
gh workflow run cd-release.yml --ref <current-branch> -f dry_run=true
gh run watch
```

Expected:
- All steps succeed.
- `npm publish --dry-run` logs show `@chainlink/cre-sdk-javy-plugin@0.0.1-cd` and `@chainlink/cre-sdk@0.0.1-cd`.
- Tag `v0.0.1-cd` is created locally on the runner but NOT pushed (dry run deletes it).
- No GitHub release is created.

- [ ] **Step 3: Verify L3 guard**

Run a manual dispatch of `publish-cre-sdk.yml` with `tag=v0.0.0-cd`:

```bash
gh workflow run publish-cre-sdk.yml -f tag=v0.0.0-cd -f dry_run=true
gh run watch
```

Expected: workflow fails fast at the "Reject cd-line tags" step with a clear error message.

- [ ] **Step 4: Verify re-run guard**

If a real cd release was already created on this commit, dispatch the workflow again on the same SHA. Expected: skips with notice "HEAD already has a cd tag".

- [ ] **Step 5: Document smoke test outcome in PR description**

Include the dry-run workflow URL and confirmation that L3 guard fired in the PR that introduces this change.

---

## Out of scope (intentionally deferred)

These were considered during design but excluded from this plan:

- **Conventional-commit-driven minor/major bumps on cd line.** Always-patch was chosen (Q2). If team adopts conventional commits later, swap `version.ts` for a parser without touching the workflow.
- **Refactoring existing `publish-cre-sdk*.yml` to `workflow_call` reusable workflows** (Q7, option A). Duplication was chosen (option B); revisit only if drift bites.
- **Branch-protect tag namespace `v*-cd`** (L4 guard). L1+L2+L3 already approved as sufficient.
- **Publishing `@chainlink/cre-sdk-examples` to npm.** Examples are pinned inside the tag commit; consumers `git checkout` the tag (Q5).
- **PR-label-driven minor/major bumps** (Q2 option C). Cheap upgrade later if always-patch proves limiting.
