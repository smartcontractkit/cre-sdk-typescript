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
