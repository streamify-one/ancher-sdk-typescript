/**
 * Shared fetch for the raw-body `/content` endpoints (note + artifact). Their
 * responses are the content bytes themselves (markdown/HTML text, or an
 * image's binary for image notes) — not JSON — so they go through the
 * client's raw `request` escape hatch; auth, CSRF, and the 401→refresh→retry
 * lifecycle still apply.
 */

import type { AncherClient } from '../api/client'
import { buildApiError } from '../api/errors'

export interface RawContentOptions {
  /** Revision number to retrieve. Defaults to the current revision. */
  revision?: number
  /** Abort signal for the fetch. */
  signal?: AbortSignal
}

/**
 * Fetch a raw-content endpoint and return the raw `Response` — callers choose
 * `text()`, `blob()`, or streaming reads (the `Content-Type` header tells
 * text from binary). Throws `AncherApiError` on a non-2xx status.
 */
export async function fetchRawContent(
  client: AncherClient,
  path: string,
  options: RawContentOptions = {},
  fallbackMessage?: string
): Promise<Response> {
  const query = options.revision === undefined ? '' : `?revision=${options.revision}`
  const response = await client.request(`${path}${query}`, { signal: options.signal ?? null })
  if (!response.ok) {
    throw await buildApiError(response, fallbackMessage)
  }
  return response
}
