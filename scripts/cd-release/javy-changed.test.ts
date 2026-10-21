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
