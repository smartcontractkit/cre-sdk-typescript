import { getAddressCodec } from '@solana/addresses'
import {
	addCodecSizePrefix, getArrayCodec, getOptionCodec, getStructCodec,
	getU32Codec, getU64Codec, getU128Codec, getUtf8Codec, getEnumCodec, getBytesCodec, fixCodecSize,
} from '@solana/codecs'

const codec = getStructCodec([
	['key', addCodecSizePrefix(getUtf8Codec(), getU32Codec())],
	['value', addCodecSizePrefix(getUtf8Codec(), getU32Codec())],
	['count', getU64Codec()],
	['big', getU128Codec()],
	['tags', getArrayCodec(addCodecSizePrefix(getUtf8Codec(), getU32Codec()), { size: getU32Codec() })],
	['maybe', getOptionCodec(getU32Codec())],
	['fixed', fixCodecSize(getBytesCodec(), 4)],
])
enum Color { Red, Green, Blue }
const enumCodec = getEnumCodec(Color)

const encoded = codec.encode({
	key: 'hello', value: 'solana', count: 42n, big: 340282366920938463463374607431768211455n,
	tags: ['a', 'b'], maybe: 7, fixed: new Uint8Array([1, 2, 3, 4]),
})
const decoded = codec.decode(encoded)
const e = enumCodec.encode(Color.Blue)
const addrBytes = getAddressCodec().encode('ECL8142j2YQAvs9R9geSsRnkVH2wLEi7soJCRyJ74cfL')
const addrBack = getAddressCodec().decode(addrBytes)
console.log(JSON.stringify({
	encodedLen: encoded.length,
	key: decoded.key, count: String(decoded.count), big: String(decoded.big),
	maybeIsSome: decoded.maybe.__option, enumByte: e[0], addrLen: addrBytes.length, addrRoundtrip: addrBack,
}))
