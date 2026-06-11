import { getAddressCodec } from '@solana/addresses'
import {
	addCodecSizePrefix,
	getArrayCodec,
	getOptionCodec,
	getStructCodec,
	getU32Codec,
	getU64Codec,
	getUtf8Codec,
} from '@solana/codecs'
import { BasicCapability as BasicTriggerCapability } from '@cre/generated-sdk/capabilities/internal/basictrigger/v1/basic_sdk_gen'
import { cre, type Runtime } from '@cre/sdk/cre'
import { Runner } from '@cre/sdk/wasm'

const userDataCodec = getStructCodec([
	['key', addCodecSizePrefix(getUtf8Codec(), getU32Codec())],
	['value', addCodecSizePrefix(getUtf8Codec(), getU32Codec())],
	['count', getU64Codec()],
	['tags', getArrayCodec(addCodecSizePrefix(getUtf8Codec(), getU32Codec()), { size: getU32Codec() })],
	['maybe', getOptionCodec(getU32Codec())],
])

const addressCodec = getAddressCodec()

const exerciseCodecs = (runtime: Runtime<Uint8Array>) => {
	const encoded = userDataCodec.encode({
		key: 'hello',
		value: 'solana',
		count: 42n,
		tags: ['a', 'b'],
		maybe: 7,
	})
	const decoded = userDataCodec.decode(encoded)
	const addr = addressCodec.encode('ECL8142j2YQAvs9R9geSsRnkVH2wLEi7soJCRyJ74cfL')
	runtime.log(`encoded=${encoded.length} decoded.key=${decoded.key} addr=${addr.length}`)
	return new Uint8Array(encoded)
}

const initWorkflow = () => {
	const basicTrigger = new BasicTriggerCapability()
	return [cre.handler(basicTrigger.trigger({}), exerciseCodecs)]
}

export async function main() {
	const runner = await Runner.newRunner<Uint8Array>({
		configParser: (c) => c,
	})
	await runner.run(initWorkflow)
}

await main()
