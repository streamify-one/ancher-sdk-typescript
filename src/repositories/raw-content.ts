/**
 * Shared read for note + artifact bodies.
 *
 * The API does not stream a body from `/content` any more. It mints a
 * presigned CDN URL and the client fetches the CDN directly — two hops, not a
 * redirect. A cross-origin redirect taints the request's `Origin` to `null`,
 * and web authenticates with cookies (`credentials: 'include'`), so the CORS
 * check would reject `Access-Control-Allow-Origin: *` and the body would be
 * unreadable by script.
 *
 * Both hops live here so the shape of the API is the SDK's problem, not every
 * app's: `getContent` still returns a `Response`, so call sites did not change
 * when the API did.
 */

import type { AncherClient } from '../api/client'
import { buildApiError } from '../api/errors'

export interface RawContentOptions {
  /** Revision number to retrieve. Defaults to the current revision. */
  revision?: number
  /** Abort signal for both hops. */
  signal?: AbortSignal
}

/** The mint's JSON envelope. */
interface PresignedDownload {
  download_url: string
  expires_in: number
}

/**
 * Mint a presigned URL for a `/content` path. `path` is the content route
 * without the `/presigned-urls` suffix, e.g. `/api/v1/notes/{id}/content`.
 *
 * This hop carries credentials and is what records the resource being opened,
 * so it goes through the client's `request` escape hatch (auth, CSRF, and the
 * 401→refresh→replay lifecycle all apply). Throws `AncherApiError` on non-2xx.
 */
export async function mintContentUrl(
  client: AncherClient,
  path: string,
  options: RawContentOptions = {},
  fallbackMessage?: string
): Promise<PresignedDownload> {
  const query = options.revision === undefined ? '' : `?revision=${options.revision}`
  const response = await client.request(`${path}/presigned-urls${query}`, {
    method: 'POST',
    signal: options.signal ?? null,
  })
  if (!response.ok) {
    throw await buildApiError(response, fallbackMessage)
  }
  return (await response.json()) as PresignedDownload
}

/**
 * Read a body: mint, then fetch the CDN. Returns the raw `Response` — callers
 * choose `text()`, `blob()`, or streaming reads (the `Content-Type` header
 * tells text from binary).
 *
 * The CDN hop goes through the client's configured `fetch` rather than the
 * global one, for two reasons: a host app can route it (web rewrites CDN URLs
 * through its dev proxy), and on desktop that transport is the native HTTP
 * client, which is not subject to CORS at all. It carries no credentials and
 * no trace header — the signed URL is the whole authorization.
 *
 * The bytes are served exactly as stored, so any embedded
 * `streamify-file://<id>` markers arrive unresolved; resolving them is the
 * caller's job (see the parent-scoped `filePresignedUrl` methods).
 */
export async function fetchRawContent(
  client: AncherClient,
  path: string,
  options: RawContentOptions = {},
  fallbackMessage?: string
): Promise<Response> {
  const { download_url: downloadUrl } = await mintContentUrl(
    client,
    path,
    options,
    fallbackMessage
  )
  const doFetch = client.config.fetch ?? globalThis.fetch
  const response = await doFetch(downloadUrl, { signal: options.signal ?? null })
  if (!response.ok) {
    // Not `buildApiError`: this is the CDN, so the body is S3/CloudFront XML
    // rather than our error envelope. A 403 here is almost always an expired
    // signature.
    throw new Error(`${fallbackMessage ?? 'Content fetch'} failed: ${response.status}`)
  }
  return response
}
