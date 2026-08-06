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
