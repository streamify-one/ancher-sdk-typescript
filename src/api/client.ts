/**
 * Top-level factory that assembles the Ancher SDK client: it wires the
 * {@link createFetcher} transport into the generated, fully-typed `ApiClient`,
 * exposes a `upload` helper for multipart endpoints, and a `request` escape
 * hatch for raw / non-JSON responses.
 */

import { buildContextHeaders, ensureFreshSession, sendWithAuthRetry } from './auth'
import { ANCHER_BASE_URL, type AncherClientConfig } from './config'
import { type ApiClient, createApiClient } from './generated/api.client'
import { newTraceId } from './trace'
import { createFetcher } from './transport'
import { createUploader, type Uploader } from './upload'

export interface AncherClient {
  /**
   * The generated, fully-typed API client. Every path/method from the OpenAPI
   * spec is available with typed params and responses:
   *
   * ```ts
   * const notes = await client.api.get('/notes/', { query: { limit: 20 } })
   * const note = await client.api.post('/notes/text', { body: { text: 'hi' } })
   * ```
   */
  api: ApiClient

  /** The resolved configuration, for advanced/derived use. */
  config: AncherClientConfig

  /**
   * Run the same guarded proactive-refresh check the transport runs before
   * every request — staleness with leeway, de-duplication, failure cooldown.
   * A no-op unless both {@link AncherClientConfig.refreshSession} and
   * {@link AncherClientConfig.getSessionExpiresAt} are configured. For
   * hand-built requests that bypass the transport (raw `fetch` to the API).
   * Pass the request's `signal` so an aborted caller isn't held waiting on a
   * stalled check.
   */
  ensureFreshSession(signal?: AbortSignal | null): Promise<void>

  /**
   * Make a raw authenticated request to an API path and get the **`Response`**
   * back — auth headers (CSRF/device/timezone/bearer), credentials, and a single
   * 401→refresh→retry are applied; it never throws on a non-2xx (inspect
   * `response.ok`). Use this for endpoints whose body is **not JSON** — e.g.
   * `text`/`blob` content downloads — which the JSON-only generated {@link api}
   * client can't return. `path` may be absolute, or relative to `baseUrl`
   * (e.g. `'/api/v1/notes/{id}/content'` — already-substituted).
   */
  request(path: string, init?: RequestInit): Promise<Response>

  /** Upload a file to a `multipart/form-data` endpoint. */
  upload: Uploader
}

/** Resolve the per-request auth/context headers shared by the raw `request` helper. */
async function requestHeaders(
  config: AncherClientConfig,
  traceId: string
): Promise<Record<string, string>> {
  return { ...config.defaultHeaders, ...(await buildContextHeaders(config, traceId)) }
}

/**
 * Create an Ancher API client.
 *
 * @example API-key auth (server-to-server)
 * ```ts
 * const client = createAncherClient({ apiKey: process.env.ANCHER_API_TOKEN })
 * ```
 */
export function createAncherClient(config: AncherClientConfig = {}): AncherClient {
  const baseUrl = config.baseUrl ?? ANCHER_BASE_URL
  const resolved: AncherClientConfig = { ...config, baseUrl }
  const fetcher = createFetcher(resolved)
  const api = createApiClient(fetcher, baseUrl)
  const upload = createUploader(resolved)
  const doFetch = resolved.fetch ?? globalThis.fetch
  const credentials = resolved.credentials ?? 'include'

  const request = (path: string, init: RequestInit = {}): Promise<Response> => {
    const url = /^https?:\/\//.test(path) ? path : `${baseUrl}${path}`
    // Held outside `send` so a 401 replay stays in the same trace.
    const traceId = newTraceId()
    return sendWithAuthRetry(
      resolved,
      async () =>
        doFetch(url, {
          ...init,
          headers: {
            ...(await requestHeaders(resolved, traceId)),
            ...(init.headers as Record<string, string> | undefined),
          },
          credentials: init.credentials ?? credentials,
        }),
      { throwOnStatusError: false, signal: init.signal }
    )
  }

  return {
    api,
    config: resolved,
    ensureFreshSession: signal => ensureFreshSession(resolved, signal),
    request,
    upload,
  }
}
