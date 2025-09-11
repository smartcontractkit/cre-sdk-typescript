import { main as buildSingleWorkflowJs } from './build-single-workflow-js-cmd'
import { main as compileSingleWorkflowToWasm } from './compile-single-workflow-to-wasm-cmd'

export const main = async () => {
	const workflowArg = process.argv[3]

	if (!workflowArg) {
		console.error('Usage: bun run build-single-workflow.ts <workflow-name>')
		console.error('Example: bun run build-single-workflow.ts secrets')
		process.exit(1)
	}

	console.info(`🚀 Building workflow: ${workflowArg}`)

	// Build JS
	console.info('\n📦 Step 1: Building JS...')
	await buildSingleWorkflowJs(workflowArg)
	// Build WASM
	console.info('\n🔨 Step 2: Compiling to WASM...')
	await compileSingleWorkflowToWasm(workflowArg)

	console.info(`\n✅ Workflow '${workflowArg}' built successfully!`)
}
