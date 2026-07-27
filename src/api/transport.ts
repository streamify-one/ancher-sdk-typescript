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
import { newTraceId } from './trace'
import type { EndpointParameters, Fetcher, Method } from './generated/api.client'

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
