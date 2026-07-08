/**
 * Shared auth + request-lifecycle helpers used by BOTH the JSON transport
 * ({@link ./transport.ts}) and the multipart uploader ({@link ./upload.ts}).
 *
 * The two callers differ only in how they build a request — the generated
 * client speaks JSON; uploads are `multipart/form-data` with optional XHR
 * progress — but the cross-cutting concerns are identical: bearer-token auth,
 * 401 → refresh → retry-once, the 403 activation gate, and normalizing non-2xx
 * into `AncherApiError`. They live here once instead of being kept in sync by
 * hand across the two files.
 */

import type { AncherClientConfig } from './config'
import { buildApiError, isActivationRequiredError } from './errors'

/**
 * Resolve the bearer-token auth header and write it into `headers`.
 *
 * The token comes from {@link AncherClientConfig.getAccessToken} — the general
 * dynamic hook for OAuth2 access tokens and rotating mobile session tokens — and
 * falls back to the static {@link AncherClientConfig.apiKey}. It is sent as
 * `Authorization: Bearer <token>` unless {@link AncherClientConfig.apiKeyHeader}
 * names a custom header, in which case the raw token is sent under that header.
 */
export async function applyAuthHeader(
  config: AncherClientConfig,
  headers: Record<string, string>
): Promise<void> {
  const token = (await config.getAccessToken?.()) ?? config.apiKey
  if (!token) return
  const header = config.apiKeyHeader ?? 'Authorization'
  headers[header] = header === 'Authorization' ? `Bearer ${token}` : token
}

/**
 * Assemble the per-request context headers shared by every caller — host headers
 * ({@link AncherClientConfig.getHeaders}), CSRF, device id, timezone, and the
 * bearer/api-key auth header (via {@link applyAuthHeader}). Callers layer their
 * own `defaultHeaders` / `Content-Type` / `Accept` on top. Re-derived per attempt
 * so retries pick up refreshed auth. (Formerly duplicated across
 * transport/upload/chat/client.)
 */
export async function buildContextHeaders(
  config: AncherClientConfig
): Promise<Record<string, string>> {
  const headers: Record<string, string> = { ...(await config.getHeaders?.()) }
  const csrf = await config.getCsrfToken?.()
  if (csrf) headers['X-CSRF-Token'] = csrf
  const deviceId = await config.getDeviceId?.()
  if (deviceId) headers['x-device-id'] = deviceId
  const timezone = await config.getTimezone?.()
  if (timezone) headers['x-timezone'] = timezone
  await applyAuthHeader(config, headers)
  return headers
}

/**
 * Combine the caller's optional `AbortSignal` with the configured request
 * timeout ({@link AncherClientConfig.timeoutMs}). Returns a signal that aborts
 * when either fires — or the caller's signal (or `undefined`) when no timeout
 * is configured.
 */
export function requestSignal(
  config: AncherClientConfig,
  signal?: AbortSignal | null
): AbortSignal | undefined {
  const timeout = config.timeoutMs
  if (!timeout || timeout <= 0) return signal ?? undefined
  const timeoutSignal = AbortSignal.timeout(timeout)
  return signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal
}

export interface SendWithAuthRetryOptions {
  /** Fallback message used when the body isn't a parseable error envelope. */
  errorMessage?: (response: Response) => string
  /**
   * Throw the normalized `AncherApiError` on a non-2xx response. When false
   * (the default), the error response is returned for the caller to inspect —
   * `config.onError` still fires either way.
   */
  throwOnStatusError?: boolean
}

/**
 * Run `send` under the shared auth lifecycle:
 *  - 401 → {@link AncherClientConfig.refreshSession} → retry once
 *  - 403 carrying the activation code → {@link AncherClientConfig.onActivationRequired} → retry once
 *  - non-2xx → normalize to `AncherApiError`, fire {@link AncherClientConfig.onError},
 *    and (optionally) throw
 *
 * `send` MUST build a fresh request on each call so retries pick up refreshed
 * auth headers (re-deriving auth per attempt is the whole point — a refreshed
 * token or session is only useful on the replay).
 */
export async function sendWithAuthRetry(
  config: AncherClientConfig,
  send: () => Promise<Response>,
  options: SendWithAuthRetryOptions = {}
): Promise<Response> {
  let response = await send()

  // 401 → silent refresh → retry once with fresh auth headers.
  if (response.status === 401 && config.refreshSession) {
    const refreshed = await config.refreshSession()
    if (refreshed) response = await send()
  }

  // 403 activation gate → let the host prompt for activation → retry once.
  if (response.status === 403 && config.onActivationRequired) {
    const error = await buildApiError(response)
    if (isActivationRequiredError(error)) {
      const result = await config.onActivationRequired(response)
      if (result === 'retry') response = await send()
    }
  }

  if (!response.ok) {
    // Fire side-effect interceptors (e.g. insufficient-credits dialog)
    // regardless of throwOnStatusError, matching the original client.
    const error = await buildApiError(response, options.errorMessage?.(response))
    config.onError?.(error)
    if (options.throwOnStatusError) throw error
  }

  return response
}
