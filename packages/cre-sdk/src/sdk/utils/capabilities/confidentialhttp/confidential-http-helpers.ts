import type { DurationJson } from '@bufbuild/protobuf/wkt'
import type {
	HTTPRequestJson as ConfidentialHTTPRequestJson,
	HeaderValuesJson,
} from '@cre/generated/capabilities/networking/confidentialhttp/v1alpha/client_pb'

/**
 * Build an HTTPRequest JSON shape for the confidential-http capability.
 *
 * The proto defines `oneof body { string body_string = 3; bytes body_bytes = 8 }`,
 * so the JSON wire keys are `bodyString` / `bodyBytes` — never plain `body`.
 * Three mutually-exclusive ways to set the body, in order of preference:
 *
 *   - `body`        ergonomic; coerces by runtime type:
 *                     - `string`     -> bodyString (verbatim)
 *                     - `Uint8Array` -> bodyBytes (base64)
 *                     - object       -> JSON.stringify -> bodyString
 *                                       (bigints as strings)
 *   - `bodyString`  pass-through to the canonical proto field
 *   - `bodyBytes`   `Uint8Array` is base64-encoded; a `string` is treated as
 *                   already-encoded base64 and passed through verbatim
 *
 * Supplying more than one of these fields throws — the underlying proto is a
 * oneof, so the call would otherwise be ambiguous.
 *
 * Headers can be passed in two ways:
 *   - `headers`: flat record with single or repeated values, mapped onto the
 *     `multiHeaders` shape under the hood.
 *   - `multiHeaders`: native proto shape `{ [name]: { values: string[] } }` —
 *     useful when forwarding headers already in canonical form.
 *
 * If both are supplied, `multiHeaders` is applied first and `headers` entries
 * merge on top per-name (replacing the values list for that name).
 */
export interface HttpRequestOptions {
	url: string
	method?: string
	body?: string | Uint8Array | object
	bodyString?: string
	bodyBytes?: Uint8Array | string
	headers?: Record<string, string | string[]>
	multiHeaders?: Record<string, HeaderValuesJson>
	templateValues?: Record<string, string>
	timeout?: DurationJson
	encryptOutput?: boolean
}

export function httpRequest(opts: HttpRequestOptions): ConfidentialHTTPRequestJson {
	const out: ConfidentialHTTPRequestJson = {
		url: opts.url,
		method: opts.method ?? 'GET',
	}

	const bodyFieldsSet =
		(opts.body !== undefined ? 1 : 0) +
		(opts.bodyString !== undefined ? 1 : 0) +
		(opts.bodyBytes !== undefined ? 1 : 0)
	if (bodyFieldsSet > 1) {
		throw new Error(
			'httpRequest: body, bodyString and bodyBytes are mutually exclusive (proto oneof)',
		)
	}

	if (opts.bodyString !== undefined) {
		out.bodyString = opts.bodyString
	} else if (opts.bodyBytes !== undefined) {
		out.bodyBytes =
			typeof opts.bodyBytes === 'string'
				? opts.bodyBytes
				: Buffer.from(opts.bodyBytes).toString('base64')
	} else if (typeof opts.body === 'string') {
		out.bodyString = opts.body
	} else if (opts.body instanceof Uint8Array) {
		out.bodyBytes = Buffer.from(opts.body).toString('base64')
	} else if (opts.body !== undefined) {
		// Compact JSON encoding; bigints serialise as strings.
		out.bodyString = JSON.stringify(opts.body, (_k, v) =>
			typeof v === 'bigint' ? v.toString() : v,
		)
	}

	if (opts.multiHeaders || opts.headers) {
		const merged: Record<string, HeaderValuesJson> = {}
		for (const [name, value] of Object.entries(opts.multiHeaders ?? {})) {
			merged[name] = { values: value.values ?? [] }
		}
		for (const [name, value] of Object.entries(opts.headers ?? {})) {
			merged[name] = { values: Array.isArray(value) ? value : [value] }
		}
		out.multiHeaders = merged
	}

	if (opts.templateValues) {
		out.templatePublicValues = { ...opts.templateValues }
	}

	if (opts.timeout) {
		out.timeout = opts.timeout
	}

	if (opts.encryptOutput) {
		out.encryptOutput = true
	}

	return out
}
