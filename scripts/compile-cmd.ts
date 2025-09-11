import { main as compileToJs } from './compile-to-js'
import { main as compileToWasm } from './compile-to-wasm-cmd'

export const main = async () => {
	await compileToJs()
	await compileToWasm()
}
