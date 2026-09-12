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
