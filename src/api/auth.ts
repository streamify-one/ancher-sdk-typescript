/**
 * Shared auth + request-lifecycle helpers used by BOTH the JSON transport
 * ({@link ./transport.ts}) and the multipart uploader ({@link ./upload.ts})
 * (and mirrored by the SSE consumer in {@link ../chat.ts}).
 *
 * The callers differ only in how they build a request — the generated client
 * speaks JSON; uploads are `multipart/form-data` with optional XHR progress —
 * but the cross-cutting concerns are identical: bearer-token auth, proactive
 * refresh near expiry ({@link ensureFreshSession}), 401 → refresh → retry-once,
 * the 403 activation gate, and normalizing non-2xx into `AncherApiError`. They
 * live here once instead of being kept in sync by hand across the files.
 */

import type { AncherClientConfig, SessionRefreshResult } from './config'
import { buildApiError, isActivationRequiredError } from './errors'
import { formatTraceparent, newTraceId } from './trace'

/**
 * Refresh this many seconds before {@link AncherClientConfig.getSessionExpiresAt}
 * by default. Shared with `createTokenManager` so every consumer — cookie
 * session, native token session, OAuth2 — refreshes on the same clock.
 */
export const DEFAULT_REFRESH_LEEWAY_SECONDS = 120

/**
 * After a failed refresh, don't attempt another *proactive* one for this long —
 * an offline client would otherwise pay a doomed refresh round trip on every
 * request. Reactive 401 refreshes are never gated (every 401 gets its one
 * attempt), and their failures arm this cooldown too.
 */
const REFRESH_FAILURE_COOLDOWN_MS = 30_000

interface SessionRefreshState {
  inFlight: Promise<SessionRefreshResult> | null
  lastFailureAt: number
}

/**
 * Per-client scheduler state, keyed on the client's resolved config object —
 * the one identity shared by the JSON transport, `client.request`, the
 * uploader, and the chat stream (all created over the same `resolved` config
 * in `createAncherClient`).
 */
const sessionRefreshState = new WeakMap<AncherClientConfig, SessionRefreshState>()

function stateFor(config: AncherClientConfig): SessionRefreshState {
  let state = sessionRefreshState.get(config)
  if (!state) {
    state = { inFlight: null, lastFailureAt: 0 }
    sessionRefreshState.set(config, state)
  }
  return state
}

/**
 * Run {@link AncherClientConfig.refreshSession} with de-duplication and
 * failure bookkeeping. Concurrent callers — proactive and reactive alike —
 * join the same in-flight attempt. A `false` result or a throw arms the
 * proactive failure cooldown; a throw is rethrown so the reactive path keeps
 * its original propagation behavior.
 */
export function runSessionRefresh(config: AncherClientConfig): Promise<SessionRefreshResult> {
  const state = stateFor(config)
  if (state.inFlight) return state.inFlight
  state.inFlight = (async () => {
    try {
      // The hook is invoked in a microtask, not synchronously: a hook that
      // throws *synchronously* would otherwise run the `finally` below during
      // the IIFE call itself — before the slot assignment completes — and the
      // rejected promise would then be written back into `state.inFlight` for
      // good, poisoning every later refresh with the original rejection.
      const result = await Promise.resolve().then(() => config.refreshSession!())
      state.lastFailureAt = result === true ? 0 : Date.now()
      return result
    } catch (error) {
      state.lastFailureAt = Date.now()
      throw error
    } finally {
      state.inFlight = null
    }
  })()
  return state.inFlight
}

/**
 * Proactively refresh the session when it is within the leeway of expiry
 * ({@link AncherClientConfig.getSessionExpiresAt} −
 * {@link AncherClientConfig.refreshLeewaySeconds}). A no-op when either hook
 * is missing or the expiry is unknown/fresh. Failures are swallowed — a
 * proactive refresh must never fail a request that might have succeeded (the
 * credential may still be valid inside the leeway window, and the reactive
 * 401 path remains the backstop).
 *
 * When {@link AncherClientConfig.timeoutMs} is configured, the whole check —
 * the expiry lookup *and* the refresh wait — is bounded by it: a stalled
 * `getSessionExpiresAt` (e.g. a hung secure-storage read) or refresh releases
 * the request (both keep running for later joiners) instead of hanging every
 * request before its own timeout race even exists — inside the leeway the
 * credential is usually still valid, and an actually-expired one just falls
 * back to the reactive path. The caller's `signal` releases the wait the same
 * way, so an aborted operation isn't held hostage by a stalled check — the
 * abort then surfaces from the network attempt itself.
 */
export async function ensureFreshSession(
  config: AncherClientConfig,
  signal?: AbortSignal | null
): Promise<void> {
  if (!config.refreshSession || !config.getSessionExpiresAt) return
  await withRequestDeadline(config, proactiveRefreshCheck(config), undefined, signal)
}

/**
 * Race `task` against the configured request deadline
 * ({@link AncherClientConfig.timeoutMs}) and the caller's abort signal.
 * Resolves with the task's value — or with `fallback` when the deadline or
 * abort fires first, in which case the task keeps running for later joiners.
 * A passthrough when neither bound applies.
 */
function withRequestDeadline<T>(
  config: AncherClientConfig,
  task: Promise<T>,
  fallback: T,
  signal?: AbortSignal | null
): Promise<T> {
  const timeout = config.timeoutMs
  const hasTimeout = typeof timeout === 'number' && timeout > 0
  if (!hasTimeout && !signal) return task
  let timer: ReturnType<typeof setTimeout> | undefined
  let onAbort: (() => void) | undefined
  const release = new Promise<T>(resolve => {
    if (signal?.aborted) {
      resolve(fallback)
      return
    }
    if (hasTimeout) timer = setTimeout(() => resolve(fallback), timeout)
    if (signal) {
      onAbort = () => resolve(fallback)
      signal.addEventListener('abort', onAbort, { once: true })
    }
  })
  return Promise.race([task, release]).finally(() => {
    clearTimeout(timer)
    if (signal && onAbort) signal.removeEventListener('abort', onAbort)
    // A rejection landing after the release won must not go unhandled.
    task.catch(() => {})
  })
}

/** The unbounded proactive check: expiry lookup → leeway → cooldown → refresh. */
async function proactiveRefreshCheck(config: AncherClientConfig): Promise<void> {
  let expiresAt: number | null | undefined
  try {
    expiresAt = await config.getSessionExpiresAt!()
  } catch {
    // A transient lookup failure (cookie/secure-storage adapter hiccup) reads
    // as an unknown expiry: skip the proactive path — the existing credential
    // may still work, and the reactive 401 path remains the backstop.
    return
  }
  if (expiresAt == null) return
  const leewayMs = (config.refreshLeewaySeconds ?? DEFAULT_REFRESH_LEEWAY_SECONDS) * 1000
  if (Date.now() < expiresAt - leewayMs) return
  const state = stateFor(config)
  // Join an in-flight refresh even during the cooldown — it's free. Otherwise
  // respect the cooldown so repeated failures don't tax every request.
  if (!state.inFlight && Date.now() - state.lastFailureAt < REFRESH_FAILURE_COOLDOWN_MS) return
  // Refresh failures are swallowed — the proactive path must never fail a
  // request that might have succeeded.
  await runSessionRefresh(config).catch(() => {})
}

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
 * ({@link AncherClientConfig.getHeaders}), CSRF, device id, timezone, the W3C
 * `traceparent`, and the bearer/api-key auth header (via {@link applyAuthHeader}).
 * Callers layer their own `defaultHeaders` / `Content-Type` / `Accept` on top.
 * Re-derived per attempt so retries pick up refreshed auth. (Formerly duplicated
 * across transport/upload/chat/client.)
 *
 * Pass `traceId` to keep a retry inside the same trace: the span id is minted
 * fresh on every call, so the 401 → refresh → replay becomes a sibling span
 * instead of an unrelated trace. Omitting it starts a new trace, which is the
 * right default for a one-shot request.
 *
 * `traceparent` is set here rather than left to {@link AncherClientConfig.getHeaders}
 * because that hook is the lowest-precedence layer and a host could clobber it;
 * explicit per-request headers still win, as documented on the config.
 */
export async function buildContextHeaders(
  config: AncherClientConfig,
  traceId: string = newTraceId()
): Promise<Record<string, string>> {
  const headers: Record<string, string> = { ...(await config.getHeaders?.()) }
  const csrf = await config.getCsrfToken?.()
  if (csrf) headers['X-CSRF-Token'] = csrf
  const deviceId = await config.getDeviceId?.()
  if (deviceId) headers['x-device-id'] = deviceId
  const timezone = await config.getTimezone?.()
  if (timezone) headers['x-timezone'] = timezone
  headers.traceparent = formatTraceparent(traceId)
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

/**
 * Classify a session-refresh response into a {@link SessionRefreshResult}.
 *
 * The distinction is the whole point: a 4xx means the server looked at the
 * credentials and said no, so the session is dead; anything else means the
 * refresh never got a verdict, so the session might be perfectly fine and the
 * user must not be signed out. Note that a *missing* refresh cookie can surface
 * as a 422 rather than a 401 (a FastAPI validation error), which is why this
 * spans the whole 4xx range instead of matching on 401 alone.
 *
 * Hosts that refresh over something other than a `fetch` response can return
 * the union members directly.
 */
export function classifySessionRefresh(response: Response): SessionRefreshResult {
  if (response.ok) return true
  return response.status >= 400 && response.status < 500 ? 'denied' : 'unreachable'
}

/**
 * Run `send` under the 401 → {@link AncherClientConfig.refreshSession} →
 * retry-once flow, firing {@link AncherClientConfig.onSessionExpired} when — and
 * only when — the refresh was *denied*.
 *
 * Shared by the JSON transport, the uploader (both via
 * {@link sendWithAuthRetry}) and the two SSE stream openers in `chat.ts`, which
 * otherwise kept three hand-copied versions of this block in sync.
 *
 * `send` MUST build a fresh request on each call so the replay picks up the
 * refreshed auth headers.
 */
export async function sendWithSessionRefresh(
  config: AncherClientConfig,
  send: () => Promise<Response>,
  signal?: AbortSignal | null
): Promise<Response> {
  await ensureFreshSession(config, signal)
  const response = await send()
  if (response.status !== 401 || !config.refreshSession) return response

  const result = await joinReactiveSessionRefresh(config, signal)
  if (result === true) return send()
  // `false` and `'unreachable'` both mean "no verdict" — surface the 401 and
  // leave the session alone.
  if (result === 'denied') config.onSessionExpired?.()
  return response
}

/**
 * The reactive 401 join: run (or join) the de-duplicated refresh, bounded by
 * the request deadline and the caller's abort signal — a never-settling
 * refresh must not hang an operation past its configured `timeoutMs`, and an
 * aborted caller must not be held waiting on it. Releasing resolves `false`,
 * so the caller surfaces the original 401 instead of retrying; a refresh that
 * *rejects* before the bound fires keeps its propagation behavior.
 */
export function joinReactiveSessionRefresh(
  config: AncherClientConfig,
  signal?: AbortSignal | null
): Promise<SessionRefreshResult> {
  return withRequestDeadline(config, runSessionRefresh(config), false, signal)
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
  /**
   * The caller's abort signal. `send` already carries it into the network
   * attempt; passing it here ALSO releases the proactive check and the
   * reactive refresh join, so an aborted operation never sits behind a
   * stalled expiry lookup or refresh.
   */
  signal?: AbortSignal | null
}

/**
 * Run `send` under the shared auth lifecycle:
 *  - session near expiry → {@link ensureFreshSession} (proactive, before the
 *    first attempt)
 *  - 401 → {@link AncherClientConfig.refreshSession} → retry once, or
 *    {@link AncherClientConfig.onSessionExpired} when the refresh is denied
 *    (via {@link sendWithSessionRefresh})
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
  let response = await sendWithSessionRefresh(config, send, options.signal)

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
