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
