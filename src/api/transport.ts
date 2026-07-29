/**
 * SDK transport: a {@link Fetcher} implementation for the generated `ApiClient`.
 *
 * This is the generalized port of the design-system's `src/lib/api-client.ts`.
 * It owns the cross-cutting request concerns — CSRF/device/timezone headers,
 * static API-key auth, silent 401 refresh + retry, the 403 activation gate, and
 * normalizing non-2xx responses into {@link AncherApiError} — while delegating
 * URL building, path/query encoding, and response parsing to the generated
 * `ApiClient` defaults.
 */

import { buildContextHeaders, requestSignal, sendWithAuthRetry } from './auth'
import type { AncherClientConfig } from './config'
import { AncherApiError } from './errors'
import { newTraceId } from './trace'
import type { EndpointParameters, Fetcher, Method } from './generated/api.client'

/** The content types the generated client treats as JSON. */
function isJsonContentType(contentType: string): boolean {
  return (
    contentType.includes('application/json') ||
    (contentType.includes('application/') && contentType.includes('json')) ||
    contentType === '*/*'
  )
}

/**
 * Parse a response body, refusing to turn an unparseable one into `undefined`.
 *
 * Mirrors the generated client's `defaultParseResponseData` content-type
 * routing with one deliberate difference: where the default swallows a JSON
 * parse failure into `undefined` — while the generated types promise a
 * non-nullable payload — this throws. A body truncated mid-flight on a 200 (a
 * dropped connection, a proxy cutting a chunked response, a suspended tab) used
 * to reach callers as `undefined` and blow up far from the request that caused
 * it, e.g. as an uncaught `has_more` of `undefined` during a React render
 * (VITA-1216).
 *
 * Bodies that are legitimately absent — a 204/205, or any empty body under a
 * JSON content type — still resolve to `undefined`.
 */
async function parseResponseData(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.startsWith('text/')) return response.text()
  if (contentType === 'application/octet-stream') return response.arrayBuffer()
  // Unknown/absent content type: the generated default yields `undefined` here
  // and callers depend on that for bodyless endpoints. Don't guess at binary.
  if (!isJsonContentType(contentType)) return undefined

  const raw = await response.text()
  if (raw.trim() === '') return undefined

  try {
    return JSON.parse(raw)
  } catch {
    // With `throwOnStatusError: false` (what `withResponse: true` sets) the
    // caller inspects `.status`/`.data` rather than catching, so an unparseable
    // *error* body has to stay data. Only a success response is a real defect.
    if (!response.ok) return undefined
    throw new AncherApiError({
      message: `Malformed JSON in the API response (HTTP ${response.status})`,
      status: response.status,
      traceId: response.headers.get('x-trace-id') || undefined,
    })
  }
}

interface FetchInput {
  method: Method
  overrides?: RequestInit
  parameters?: EndpointParameters
  path: string
  throwOnStatusError?: boolean
  url: URL
  urlSearchParams?: URLSearchParams
}

export function createFetcher(config: AncherClientConfig): Fetcher {
  const doFetch = config.fetch ?? globalThis.fetch
  if (!doFetch) {
    throw new Error('No `fetch` implementation available. Pass `config.fetch`.')
  }
  const credentials = config.credentials ?? 'include'

  /** Resolve the per-request auth/context headers (CSRF, device, timezone, trace, key). */
  function authHeaders(traceId: string): Promise<Record<string, string>> {
    return buildContextHeaders(config, traceId)
  }

  /** Build the final RequestInit for a call (re-derives auth headers each attempt). */
  async function buildInit(input: FetchInput, traceId: string): Promise<RequestInit> {
    const hasBody = input.parameters?.body !== undefined
    const headers: Record<string, string> = {
      ...config.defaultHeaders,
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      ...(await authHeaders(traceId)),
      ...(input.parameters?.header as Record<string, string> | undefined),
      ...(input.overrides?.headers as Record<string, string> | undefined),
    }

    return {
      ...input.overrides,
      method: input.method.toUpperCase(),
      headers,
      credentials,
      body: hasBody ? JSON.stringify(input.parameters?.body) : input.overrides?.body,
      signal: requestSignal(config, input.overrides?.signal),
    }
  }

  function encodeSearchParams(queryParams: Record<string, unknown> | undefined): URLSearchParams {
    const search = new URLSearchParams()
    if (!queryParams) return search
    for (const [key, value] of Object.entries(queryParams)) {
      if (value == null) continue
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        search.append(key, String(value))
      } else if (Array.isArray(value)) {
        // String arrays (e.g. order_by) → repeated primitives; arrays of objects
        // (criteria) → one JSON-encoded entry each.
        for (const item of value) {
          if (item == null) continue
          search.append(key, typeof item === 'string' ? item : JSON.stringify(item))
        }
      } else {
        search.append(key, JSON.stringify(value))
      }
    }
    return search
  }

  function buildUrl(input: FetchInput): string {
    const query = input.urlSearchParams?.toString()
    return query ? `${input.url.href}?${query}` : input.url.href
  }

  return {
    // The Ancher list endpoints accept structured criteria (`and`/`or`/`not`,
    // `status: { eq }`) that must be JSON-encoded per value; `order_by` stays a
    // repeated primitive. The generated default would `String(obj)` these into
    // `[object Object]`, so we encode here.
    encodeSearchParams,

    // The generated default turns any unparseable success body into `undefined`
    // while still typing the call as returning its schema — see above.
    parseResponseData,

    async fetch(input: FetchInput): Promise<Response> {
      const url = buildUrl(input)
      // One trace id per logical call, held outside `send` so the retry below
      // replays into the same trace (with a fresh span id per attempt).
      const traceId = newTraceId()

      // The shared lifecycle (auth, 401→refresh→retry, 403 activation gate,
      // error normalization) lives in `./auth`; `send` rebuilds the request each
      // attempt so retries pick up refreshed auth headers. When the caller opted
      // into status-error throwing (the default for direct `.get()/.post()`),
      // the rich `AncherApiError` is thrown; with `throwOnStatusError: false`
      // (e.g. `withResponse: true`) the error response is returned instead.
      return sendWithAuthRetry(config, async () => doFetch(url, await buildInit(input, traceId)), {
        throwOnStatusError: input.throwOnStatusError,
      })
    },
  }
}
