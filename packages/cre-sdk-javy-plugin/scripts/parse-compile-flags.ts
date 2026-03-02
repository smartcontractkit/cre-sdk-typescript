export function parseCompileFlags(argv: string[]): {
	creExports: string[]
	plugin: string | null
	rest: string[]
} {
	const creExports: string[] = []
	let plugin: string | null = null
	const rest: string[] = []
	for (let i = 0; i < argv.length; i++) {
		if (argv[i] === '--cre-exports' && i + 1 < argv.length) {
			creExports.push(argv[i + 1])
			i++
		} else if (argv[i] === '--plugin' && i + 1 < argv.length) {
			plugin = argv[i + 1]
			i++
		} else {
			rest.push(argv[i])
		}
	}
	return { creExports, plugin, rest }
}
