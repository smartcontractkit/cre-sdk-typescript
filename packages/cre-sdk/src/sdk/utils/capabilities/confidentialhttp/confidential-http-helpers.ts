import type { DurationJson } from '@bufbuild/protobuf/wkt'
import type {
	ConfidentialHTTPRequestJson,
	HeaderValuesJson,
	HTTPRequestJson,
} from '@cre/generated/capabilities/networking/confidentialhttp/v1alpha/client_pb'

export type HttpRequestBody = string | Uint8Array | object

export type ConfidentialHttpRequestOptions = Omit<HTTPRequestJson, 'bodyBytes'> & {
	body?: HttpRequestBody
	bodyBytes?: Uint8Array | string
	headers?: Record<string, string | string[]>
	templateValues?: Record<string, string>
}

export type ConfidentialHttpRequestInput = Omit<ConfidentialHTTPRequestJson, 'request'> & {
	request?: ConfidentialHttpRequestOptions
}

/**
 * Build an HTTPRequest JSON shape for the confidential-http capability.
 *
 * The proto defines `oneof body { string body_string = 3; bytes body_bytes = 8 }`,
 * so the JSON wire keys are `bodyString` / `bodyBytes`, never plain `body`.
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
 * Supplying more than one of these fields throws because the underlying proto is a
 * oneof, so the call would otherwise be ambiguous.
 *
 * Headers can be passed in two ways:
 *   - `headers`: flat record with single or repeated values, mapped onto the
 *     `multiHeaders` shape under the hood.
 *   - `multiHeaders`: native proto shape `{ [name]: { values: string[] } }`,
 *     useful when forwarding headers already in canonical form.
 *
 * If both are supplied, `multiHeaders` is applied first and `headers` entries
 * merge on top per-name (replacing the values list for that name).
 */
export interface HttpRequestOptions extends ConfidentialHttpRequestOptions {
	url: string
	timeout?: DurationJson
}

export function normalizeConfidentialHttpRequestInput(
	input: ConfidentialHttpRequestInput,
): ConfidentialHTTPRequestJson {
	const { request, ...rest } = input
	if (!request) {
		return rest
	}

	return {
		...rest,
		request: normalizeHttpRequest(request),
	}
}

export function normalizeHttpRequest(opts: ConfidentialHttpRequestOptions): HTTPRequestJson {
	const { body, bodyBytes, headers, templateValues, ...canonical } = opts
	const out: HTTPRequestJson = { ...canonical }

	const bodyFieldsSet =
		(body !== undefined ? 1 : 0) +
		(opts.bodyString !== undefined ? 1 : 0) +
		(bodyBytes !== undefined ? 1 : 0)
	if (bodyFieldsSet > 1) {
		throw new Error(
			'confidential HTTP request: body, bodyString and bodyBytes are mutually exclusive (proto oneof)',
		)
	}

	if (opts.bodyString !== undefined) {
		out.bodyString = opts.bodyString
	} else if (bodyBytes !== undefined) {
		out.bodyBytes =
			typeof bodyBytes === 'string' ? bodyBytes : Buffer.from(bodyBytes).toString('base64')
	} else if (typeof body === 'string') {
		out.bodyString = body
	} else if (body instanceof Uint8Array) {
		out.bodyBytes = Buffer.from(body).toString('base64')
	} else if (body !== undefined) {
		out.bodyString = JSON.stringify(body, (_key, value) =>
			typeof value === 'bigint' ? value.toString() : value,
		)
	}

	if (out.multiHeaders || headers) {
		const merged: Record<string, HeaderValuesJson> = {}
		for (const [name, value] of Object.entries(out.multiHeaders ?? {})) {
			merged[name] = { values: value.values ?? [] }
		}
		for (const [name, value] of Object.entries(headers ?? {})) {
			merged[name] = { values: Array.isArray(value) ? value : [value] }
		}
		out.multiHeaders = merged
	}

	if (templateValues) {
		out.templatePublicValues = { ...templateValues }
	}

	return out
}

export function httpRequest(opts: HttpRequestOptions): HTTPRequestJson {
	return normalizeHttpRequest({
		...opts,
		method: opts.method ?? 'GET',
	})
}
