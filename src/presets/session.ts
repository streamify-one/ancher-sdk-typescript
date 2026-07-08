/**
 * Session auth preset — for first-party **app clients** (mobile app, browser
 * extension) that authenticate via the Ancher `/session` routes and carry a
 * bearer token, rather than the cookie-based `web-session` flow used by the web
 * SPA.
 *
 * It performs the *acquisition* against the `/session` routes and delegates the
 * token *lifecycle* (proactive + reactive refresh, de-dup, storage, attaching
 * the bearer) to the shared {@link createTokenManager}:
 *  - {@link SessionAuth.login} — email/password → `POST /api/v1/session`
 *  - {@link SessionAuth.loginWithProvider} — Apple/Google ID token → `POST /api/v1/session/{provider}`
 *  - refresh → `PUT /api/v1/session` (refresh token), wired into `refreshSession`
 *  - {@link SessionAuth.logout} — `DELETE /api/v1/session`
 *
 * The `/session` routes require device metadata headers, so {@link SessionAuthOptions.device}
 * is mandatory. Token storage is injectable: mobile → Keychain/Keystore;
 * extension → `chrome.storage`; otherwise in-memory.
 *
 * Passwords are never stored — {@link SessionAuth.login} exchanges them once for
 * tokens and keeps only the tokens; the refresh token renews the session
 * thereafter.
 */

import { ANCHER_BASE_URL, type MaybePromise } from '../api/config'
import { buildApiError } from '../api/errors'
import {
  createTokenManager,
  type ManagedTokens,
  type TokenManager,
  type TokenStore,
} from '../api/token-manager'
// Type-only import — erased at build, so the session bundle stays free of the
// generated module. The enum const lives in `@ancher-ai/sdk/contracts`.
import type { OAuthProvider } from '../contracts/auth'

/** Tokens managed by the session preset (alias of {@link ManagedTokens}). */
export type SessionTokens = ManagedTokens
/** Token store for the session preset (alias of {@link TokenStore}). */
export type SessionTokenStore = TokenStore

/**
 * Device metadata required by the `/session` routes, sent as headers. Supply
 * real values per client — e.g. mobile: the OS/app; extension: `'Chrome
 * Extension'`, the browser, and the extension version.
 */
export interface DeviceInfo {
  /** `x-app-version` */
  appVersion: string
  /** `x-device-model` */
  deviceModel: string
  /** `x-device-name` */
  deviceName: string
  /** `x-os-name` */
  osName: string
  /** `x-os-version` */
  osVersion: string
  /** `user-agent` */
  userAgent: string
  /** `x-device-id` — a stable per-device identifier. Sent when provided. */
  deviceId?: string
  /** `x-timezone` — IANA timezone. Sent when provided. */
  timezone?: string
}

export interface SessionAuthOptions {
  /** API **origin** only. Defaults to {@link ANCHER_BASE_URL}. */
  baseUrl?: string
  /** Device metadata for the `/session` routes — static, or resolved per call. */
  device: DeviceInfo | (() => MaybePromise<DeviceInfo>)
  /** Proactive-refresh leeway, in seconds. Default 60. */
  expiryLeewaySeconds?: number
  /** `fetch` implementation. Defaults to the global `fetch`. */
  fetch?: typeof fetch
  /** Token persistence. Defaults to in-memory. */
  store?: SessionTokenStore
}

export interface SessionAuth {
  /** Spread into {@link createAncherClient}'s config (`getAccessToken`, `refreshSession`, `credentials`). */
  authConfig: TokenManager['authConfig']
  /** The current access token, refreshing first if it's stale. `null` if unauthenticated. */
  getAccessToken(): Promise<string | null>
  /** The currently stored tokens, if any. */
  getTokens(): Promise<SessionTokens | null>
  /** Email/password login → `POST /api/v1/session`. Stores the resulting tokens. */
  login(email: string, password: string): Promise<SessionTokens>
  /** Native OAuth ID-token login (Apple/Google) → `POST /api/v1/session/{provider}`. Stores the tokens. */
  loginWithProvider(provider: OAuthProvider, idToken: string): Promise<SessionTokens>
  /** Revoke the session server-side (`DELETE /api/v1/session`) and clear local tokens. Best-effort on the network call. */
  logout(): Promise<void>
  /** Force a refresh now (`PUT /api/v1/session`). Returns `true` on success. */
  refresh(): Promise<boolean>
  /** Store tokens obtained out-of-band. Pass `null` to clear. */
  setTokens(tokens: SessionTokens | null): Promise<void>
}

/**
 * Shape of `NewSessionResponse` (mirrors the generated `Schemas.NewSessionResponse`;
 * kept local so this preset doesn't pull in the full generated module).
 */
interface NewSessionResponse {
  access_token: string
  expires_in: number
  refresh_token: string
  token_type: string
}

function toTokens(res: NewSessionResponse): SessionTokens {
  return {
    accessToken: res.access_token,
    refreshToken: res.refresh_token,
    expiresAt: Date.now() + res.expires_in * 1000,
    tokenType: res.token_type,
  }
}

/**
 * Create a session-auth helper for a first-party app client.
 *
 * @example Browser extension (email/password + Google, tokens in chrome.storage)
 * ```ts
 * const session = createSessionAuth({
 *   device: { userAgent: navigator.userAgent, deviceName: 'Chrome Extension',
 *             deviceModel: 'extension', osName: 'chrome', osVersion: '0', appVersion: '1.2.3' },
 *   store: chromeStorageTokenStore,
 * })
 * await session.login(email, password)
 * // or: await session.loginWithProvider('google', googleIdToken)
 * const client = createAncherClient({ ...session.authConfig })
 * ```
 */
export function createSessionAuth(options: SessionAuthOptions): SessionAuth {
  const doFetch = options.fetch ?? globalThis.fetch
  if (!doFetch) {
    throw new Error('No `fetch` implementation available. Pass `options.fetch`.')
  }
  const baseUrl = options.baseUrl ?? ANCHER_BASE_URL

  async function deviceHeaders(): Promise<Record<string, string>> {
    const d = typeof options.device === 'function' ? await options.device() : options.device
    return {
      'user-agent': d.userAgent,
      'x-device-name': d.deviceName,
      'x-device-model': d.deviceModel,
      'x-os-name': d.osName,
      'x-os-version': d.osVersion,
      'x-app-version': d.appVersion,
      ...(d.deviceId ? { 'x-device-id': d.deviceId } : {}),
      ...(d.timezone ? { 'x-timezone': d.timezone } : {}),
    }
  }

  /** Call a `/session` route. Throws `AncherApiError` on non-2xx. */
  async function request(
    path: string,
    init: { method: string; body?: unknown; accessToken?: string | null }
  ): Promise<NewSessionResponse | null> {
    const headers: Record<string, string> = {
      ...(await deviceHeaders()),
      Accept: 'application/json',
    }
    if (init.body !== undefined) headers['Content-Type'] = 'application/json'
    if (init.accessToken) headers['Authorization'] = `Bearer ${init.accessToken}`

    const response = await doFetch(`${baseUrl}${path}`, {
      method: init.method,
      headers,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    })
    if (!response.ok) throw await buildApiError(response)
    if (response.status === 204) return null
    return (await response.json()) as NewSessionResponse
  }

  const manager = createTokenManager({
    store: options.store,
    expiryLeewaySeconds: options.expiryLeewaySeconds,
    refresh: async current => {
      if (!current.refreshToken) return null
      const res = await request('/api/v1/session', {
        method: 'PUT',
        body: { refresh_token: current.refreshToken },
      })
      return res ? toTokens(res) : null
    },
  })

  async function login(email: string, password: string): Promise<SessionTokens> {
    const res = await request('/api/v1/session', { method: 'POST', body: { email, password } })
    if (!res) throw new Error('Session response was empty.')
    const tokens = toTokens(res)
    await manager.setTokens(tokens)
    return tokens
  }

  async function loginWithProvider(
    provider: OAuthProvider,
    idToken: string
  ): Promise<SessionTokens> {
    const res = await request(`/api/v1/session/${provider}`, {
      method: 'POST',
      body: { id_token: idToken },
    })
    if (!res) throw new Error('Session response was empty.')
    const tokens = toTokens(res)
    await manager.setTokens(tokens)
    return tokens
  }

  async function logout(): Promise<void> {
    const accessToken = await manager.getAccessToken()
    try {
      await request('/api/v1/session', { method: 'DELETE', accessToken })
    } catch {
      // Best-effort: still clear local tokens below.
    }
    await manager.setTokens(null)
  }

  return {
    authConfig: manager.authConfig,
    login,
    loginWithProvider,
    logout,
    getAccessToken: manager.getAccessToken,
    getTokens: manager.getTokens,
    setTokens: manager.setTokens,
    refresh: manager.refresh,
  }
}
