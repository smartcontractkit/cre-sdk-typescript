import { spawn } from 'node:child_process'

export const JAVY_VERSION = 'v8.1.0'

export function run(
	cmd: string,
	args: string[],
	cwd: string,
	env?: Record<string, string>,
): Promise<void> {
	return new Promise((resolve, reject) => {
		const p = spawn(cmd, args, {
			cwd,
			stdio: 'inherit',
			env: env ? { ...process.env, ...env } : process.env,
		})
		p.on('error', reject)
		p.on('exit', (code) => {
			if (code === 0) resolve()
			else reject(new Error(`${cmd} exited with ${code}`))
		})
	})
}
