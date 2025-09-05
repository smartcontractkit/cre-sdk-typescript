#!/usr/bin/env bun

import { spawn } from 'node:child_process'
import { join } from 'node:path'

export const main = async () => {
	const pluginDir = join(process.cwd(), 'plugins', 'javy_chainlink_sdk')

	console.info('\n\n---> Chainlink SDK Javy plugin (Rust) \n\n')

	return new Promise<void>((resolve, reject) => {
		const buildProcess = spawn('cargo', ['build', '--target', 'wasm32-wasip1', '--release'], {
			cwd: pluginDir,
			stdio: 'inherit',
			shell: true,
		})

		buildProcess.on('close', (code) => {
			if (code === 0) {
				console.info('Done!')
				resolve()
			} else {
				console.error(`❌ Plugin build failed with code ${code}`)
				reject(new Error(`Plugin build failed with code ${code}`))
			}
		})

		buildProcess.on('error', (error) => {
			console.error('❌ Failed to start build process:', error)
			reject(error)
		})
	})
}
