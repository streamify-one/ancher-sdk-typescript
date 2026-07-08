/// <reference lib="dom" />
/**
 * Configuration surface for the Ancher SDK.
 *
 * The transport ({@link ./transport.ts}) is intentionally decoupled from any
 * specific runtime: every browser- or app-specific concern (CSRF cookies,
 * device IDs, silent refresh, the insufficient-credits dialog, the activation
 * gate) is expressed as an injectable hook so the same client works in a
 * browser SPA, a Node service, an edge worker, or a test.
 */

import type { AncherApiError } from './errors'

export type MaybePromise<T> = T | Promise<T>

/** Default API origin used when {@link AncherClientConfig.baseUrl} is omitted. */
export const ANCHER_BASE_URL = 'https://api.ancher.ai'

export interface AncherClientConfig {
  /**
   * Static bearer token for server-to-server auth — convenience sugar for a
   * constant {@link getAccessToken}. Sent as `Authorization: Bearer <key>`
   * unless {@link apiKeyHeader} is set. Ignored when {@link getAccessToken}
   * returns a value.
   */
  apiKey?: string

  /**
   * Header to carry the token from {@link getAccessToken}/{@link apiKey}.
   * Defaults to `Authorization` (as a Bearer token). Set e.g. `'x-api-key'` to
   * send the raw token in a custom header.
   */
  apiKeyHeader?: string
  /**
   * API **origin** only — no path, no trailing slash, e.g.
   * `https://api.ancher.ai`. Defaults to {@link ANCHER_BASE_URL}
   * (`https://api.ancher.ai`) when omitted.
   *
   * The generated endpoint paths already carry the `/api/v1` prefix (they are
   * the literal OpenAPI keys, e.g. `'/api/v1/notes/'`), so this must NOT include
   * it. The client builds request URLs as `baseUrl + path`.
   */
  baseUrl?: string

  /**
   * Credentials mode for every request. Defaults to `'include'` so cookie-based
   * session auth works in the browser. Set to `'omit'` for token-only auth.
   */
  credentials?: RequestCredentials

  /** Extra headers merged into every request (lowest precedence). */
  defaultHeaders?: Record<string, string>

  /**
   * `fetch` implementation to use. Defaults to the global `fetch`. Provide one
   * for Node < 18, undici, or to inject a mock in tests.
   */
  fetch?: typeof fetch

  /**
   * Per-request timeout in milliseconds. When set (> 0), every JSON request and
   * multipart upload aborts if it hasn't completed in time — combined with any
   * caller-supplied `AbortSignal`. Unset (the default) means no SDK-imposed
   * timeout. Applies per attempt, so a 401→refresh→retry gets a fresh window.
   */
  timeoutMs?: number

  /**
   * Returns the current bearer token, sent as `Authorization: Bearer <token>`
   * (or under {@link apiKeyHeader} if set). This is the **general** auth hook:
   * use it for an OAuth2 access token, a rotating mobile session token, or any
   * credential that changes over time.
   *
   * Re-invoked on every request — and again on each retry after
   * {@link refreshSession} — so always return the *current* token. Takes
   * precedence over {@link apiKey}. Return `null`/`undefined` to send no auth
   * header (e.g. when relying on cookie-session auth instead).
   *
   * See {@link ./presets/oauth2.ts} (`createOAuth2Auth`) for a ready-made
   * implementation that manages the OAuth2 token lifecycle.
   */
  getAccessToken?: () => MaybePromise<string | null | undefined>

  /**
   * Returns the CSRF token for the double-submit pattern. Sent as `X-CSRF-Token`
   * when non-null. In the browser this reads the `streamify_csrf_token` cookie
   * (see {@link ./presets/browser.ts}); omit for token-only auth.
   */
  getCsrfToken?: () => MaybePromise<string | null | undefined>

  /** Returns a stable device identifier, sent as `x-device-id`. */
  getDeviceId?: () => MaybePromise<string | null | undefined>

  /**
   * Returns extra per-request headers, resolved fresh on every request (and
   * retry). Use this for a dynamic header set that the discrete hooks above
   * don't cover — e.g. a native client's full device fingerprint
   * (`x-device-name`, `x-device-model`, `x-os-name`, `x-os-version`,
   * `x-app-version`). Merged as a **base** layer: the discrete hooks
   * (`getCsrfToken`/`getDeviceId`/`getTimezone`) and the auth header take
   * precedence over keys returned here, and explicit per-request headers win
   * over all of them.
   */
  getHeaders?: () => MaybePromise<Record<string, string> | null | undefined>

  /** Returns an IANA timezone, sent as `x-timezone`. */
  getTimezone?: () => MaybePromise<string | null | undefined>

  /**
   * Called on a 403 carrying the activation-gate code (`API-USR010`). Resolve
   * `'retry'` once the user has activated to replay the request once, or `null`
   * to surface the error.
   */
  onActivationRequired?: (response: Response) => MaybePromise<'retry' | null>

  /**
   * Invoked with the normalized error just before it is thrown. Use it for
   * cross-cutting side effects — e.g. opening an insufficient-credits dialog on
   * `API-BIS002`. Must not throw.
   */
  onError?: (error: AncherApiError) => void

  /**
   * Called on a 401. Attempt to refresh the session (e.g. `PUT /web-session`
   * using the refresh-token cookie). Resolve `true` to retry the original
   * request once, `false` to surface the 401.
   */
  refreshSession?: () => MaybePromise<boolean>
}
