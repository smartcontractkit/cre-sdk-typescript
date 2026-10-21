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
