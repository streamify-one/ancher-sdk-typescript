/// <reference lib="dom" />
/**
 * OAuth2 auth preset — runtime-agnostic.
 *
 * Wires an OAuth2 token lifecycle into the SDK **without the transport ever
 * running the redirect dance**: the client only ever *carries* the access token
 * and *refreshes* it. The host owns the user-facing steps (opening the
 * authorization URL, capturing the redirect); this preset owns the pure
 * mechanics — PKCE, the authorization URL, the code/refresh token exchanges,
 * token storage, and the `getAccessToken` / `refreshSession` hooks you spread
 * into {@link createAncherClient}'s config.
 *
 * It fits three shapes:
 *  - **Authorization Code + PKCE** (mobile / SPA public clients):
 *    {@link OAuth2Auth.getAuthorizationUrl} → host opens it → capture the
 *    redirect → {@link OAuth2Auth.exchangeCode}.
 *  - **Tokens obtained out-of-band** (e.g. native Apple/Google sign-in via
 *    `POST /api/v1/session/{provider}`): call {@link OAuth2Auth.setTokens}.
 *  - **Confidential clients** (server): set {@link OAuth2Options.clientSecret}.
 *
 * Requires WebCrypto (`globalThis.crypto`), available in browsers, Node 18+,
 * Deno, and edge runtimes. On React Native, polyfill it (e.g.
 * `react-native-get-random-values`).
 */

import type { AncherClientConfig } from '../api/config'
import { createTokenManager, type ManagedTokens, type TokenStore } from '../api/token-manager'

/** A set of OAuth2 tokens as persisted by the preset (alias of {@link ManagedTokens}). */
export type OAuth2Tokens = ManagedTokens

/**
 * Pluggable token persistence (alias of {@link TokenStore}). Defaults to
 * in-memory (lost on reload). On mobile, back it with secure storage
 * (Keychain / Keystore); in the browser, `localStorage`/`sessionStorage`.
 */
export type OAuth2TokenStore = TokenStore

export interface OAuth2Options {
  /**
   * OAuth2 authorization endpoint (absolute URL). Required only if you use
   * {@link OAuth2Auth.getAuthorizationUrl}.
   */
  authorizationEndpoint?: string
  clientId: string
  /** Confidential clients only. Omit for mobile/SPA public clients (PKCE). */
  clientSecret?: string
  /**
   * Treat the access token as stale this many seconds *before* its actual
   * expiry, so a refresh happens proactively instead of mid-request. Defaults
   * to the SDK-wide `DEFAULT_REFRESH_LEEWAY_SECONDS` (120) — the same clock
   * the transport's proactive scheduler runs on.
   */
  expiryLeewaySeconds?: number
  /** `fetch` implementation. Defaults to the global `fetch`. */
  fetch?: typeof fetch
  /** Default redirect URI for the authorization-code flow. */
  redirectUri?: string
  /** Optional RFC 7009 revocation endpoint used by {@link OAuth2Auth.logout}. */
  revocationEndpoint?: string
  /** Default scope string (space-delimited). */
  scope?: string
  /** Token persistence. Defaults to in-memory. */
  store?: OAuth2TokenStore
  /** OAuth2 token endpoint (absolute URL), e.g. `${origin}/api/v1/oauth2/token`. */
  tokenEndpoint: string
}

export interface AuthorizationUrlOptions {
  /** Extra query params merged into the authorization URL (e.g. `prompt`, `login_hint`). */
  extraParams?: Record<string, string>
  /** Override the configured {@link OAuth2Options.redirectUri} for this request. */
  redirectUri?: string
  /** Override the configured {@link OAuth2Options.scope} for this request. */
  scope?: string
}

export interface AuthorizationRequest {
  /** PKCE code verifier — retain it and pass to {@link OAuth2Auth.exchangeCode}. */
  codeVerifier: string
  /** Opaque CSRF state — compare against the `state` on the redirect back. */
  state: string
  /** The authorization URL to open / redirect the user to. */
  url: string
}

export interface ExchangeCodeOptions {
  /** The `code` query param from the redirect. */
  code: string
  /** The PKCE verifier returned by {@link OAuth2Auth.getAuthorizationUrl}. */
  codeVerifier: string
  /** Must match the redirect URI used to obtain the code, if one was sent. */
  redirectUri?: string
}

export interface OAuth2Auth {
  /**
   * Spread into {@link createAncherClient}'s config — provides `getAccessToken`,
   * `refreshSession`, and `credentials: 'omit'` (token auth, no cookies).
   */
  authConfig: Pick<
    AncherClientConfig,
    | 'getAccessToken'
    | 'refreshSession'
    | 'getSessionExpiresAt'
    | 'refreshLeewaySeconds'
    | 'credentials'
  >
  /** Exchange an authorization code (+ PKCE verifier) for tokens, then store them. */
  exchangeCode(options: ExchangeCodeOptions): Promise<OAuth2Tokens>
  /** The current access token, refreshing first if it's stale. `null` if unauthenticated. */
  getAccessToken(): Promise<string | null>
  /** Build an Authorization-Code + PKCE URL (plus the verifier/state to retain). */
  getAuthorizationUrl(options?: AuthorizationUrlOptions): Promise<AuthorizationRequest>
  /** The currently stored tokens, if any. */
  getTokens(): Promise<OAuth2Tokens | null>
  /** Clear stored tokens (and revoke the refresh token if {@link OAuth2Options.revocationEndpoint} is set). */
  logout(): Promise<void>
  /** Force a refresh-token exchange now. Returns `true` on success. */
  refresh(): Promise<boolean>
  /** Store tokens obtained out-of-band (e.g. native sign-in). Pass `null` to clear. */
  setTokens(tokens: OAuth2Tokens | null): Promise<void>
}

/** Shape of a successful OAuth2 token-endpoint response (RFC 6749 §5.1). */
interface OAuth2TokenResponse {
  access_token: string
  expires_in?: number
  refresh_token?: string
  scope?: string
  token_type?: string
}

function toTokens(res: OAuth2TokenResponse, previous?: OAuth2Tokens | null): OAuth2Tokens {
  return {
    accessToken: res.access_token,
    // Providers may omit refresh_token on a refresh response — keep the prior one.
    refreshToken: res.refresh_token ?? previous?.refreshToken,
    expiresAt: res.expires_in != null ? Date.now() + res.expires_in * 1000 : undefined,
    tokenType: res.token_type ?? previous?.tokenType,
    scope: res.scope ?? previous?.scope,
  }
}

/**
 * Create an OAuth2 auth helper. Spread {@link OAuth2Auth.authConfig} into your
 * client config and drive the flow with the returned methods.
 *
 * @example Mobile / SPA (Authorization Code + PKCE)
 * ```ts
 * const oauth = createOAuth2Auth({
 *   authorizationEndpoint: 'https://api.ancher.ai/api/v1/oauth2/authorize',
 *   tokenEndpoint: 'https://api.ancher.ai/api/v1/oauth2/token',
 *   clientId: 'my-app',
 *   redirectUri: 'myapp://callback',
 *   store: secureTokenStore, // Keychain / Keystore on mobile
 * })
 *
 * const { url, codeVerifier, state } = await oauth.getAuthorizationUrl()
 * // ...host opens `url`, user authorizes, redirect comes back with `code` + `state`...
 * if (returnedState !== state) throw new Error('state mismatch')
 * await oauth.exchangeCode({ code, codeVerifier })
 *
 * const client = createAncherClient({ baseUrl: origin, ...oauth.authConfig })
 * ```
 */
export function createOAuth2Auth(options: OAuth2Options): OAuth2Auth {
  const doFetch = options.fetch ?? globalThis.fetch
  if (!doFetch) {
    throw new Error('No `fetch` implementation available. Pass `options.fetch`.')
  }
  async function tokenRequest(
    body: Record<string, string>,
    previous?: OAuth2Tokens | null
  ): Promise<OAuth2Tokens> {
    const params = new URLSearchParams(body)
    params.set('client_id', options.clientId)
    if (options.clientSecret) params.set('client_secret', options.clientSecret)

    const response = await doFetch(options.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: params.toString(),
    })
    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new Error(`OAuth2 token request failed (${response.status}): ${text}`)
    }
    const json = (await response.json()) as OAuth2TokenResponse
    return toTokens(json, previous)
  }

  // The token lifecycle (proactive + reactive refresh, de-dup, storage) is
  // delegated to `createTokenManager`; OAuth2 only injects *how* a refresh
  // happens (the refresh_token grant against the token endpoint).
  const manager = createTokenManager({
    store: options.store,
    expiryLeewaySeconds: options.expiryLeewaySeconds,
    refresh: async current => {
      if (!current.refreshToken) return null
      return tokenRequest(
        { grant_type: 'refresh_token', refresh_token: current.refreshToken },
        current
      )
    },
  })

  async function getAuthorizationUrl(
    opts: AuthorizationUrlOptions = {}
  ): Promise<AuthorizationRequest> {
    if (!options.authorizationEndpoint) {
      throw new Error('`authorizationEndpoint` is required to build an authorization URL.')
    }
    const redirectUri = opts.redirectUri ?? options.redirectUri
    if (!redirectUri) {
      throw new Error('A `redirectUri` is required to build an authorization URL.')
    }

    const { verifier, challenge } = await generatePkce()
    const state = randomUrlToken(32)

    const url = new URL(options.authorizationEndpoint)
    const { searchParams } = url
    searchParams.set('response_type', 'code')
    searchParams.set('client_id', options.clientId)
    searchParams.set('redirect_uri', redirectUri)
    searchParams.set('code_challenge', challenge)
    searchParams.set('code_challenge_method', 'S256')
    searchParams.set('state', state)
    const scope = opts.scope ?? options.scope
    if (scope) searchParams.set('scope', scope)
    for (const [key, value] of Object.entries(opts.extraParams ?? {})) {
      searchParams.set(key, value)
    }

    return { url: url.toString(), codeVerifier: verifier, state }
  }

  async function exchangeCode(opts: ExchangeCodeOptions): Promise<OAuth2Tokens> {
    const body: Record<string, string> = {
      grant_type: 'authorization_code',
      code: opts.code,
      code_verifier: opts.codeVerifier,
    }
    const redirectUri = opts.redirectUri ?? options.redirectUri
    if (redirectUri) body.redirect_uri = redirectUri

    const tokens = await tokenRequest(body)
    await manager.setTokens(tokens)
    return tokens
  }

  async function logout(): Promise<void> {
    const current = await manager.getTokens()
    if (options.revocationEndpoint && current?.refreshToken) {
      try {
        const params = new URLSearchParams({
          token: current.refreshToken,
          token_type_hint: 'refresh_token',
        })
        params.set('client_id', options.clientId)
        if (options.clientSecret) params.set('client_secret', options.clientSecret)
        await doFetch(options.revocationEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
        })
      } catch {
        // Best-effort: still clear local tokens below.
      }
    }
    await manager.setTokens(null)
  }

  return {
    authConfig: manager.authConfig,
    getAuthorizationUrl,
    exchangeCode,
    setTokens: manager.setTokens,
    getTokens: manager.getTokens,
    getAccessToken: manager.getAccessToken,
    refresh: manager.refresh,
    logout,
  }
}

/** A PKCE pair (RFC 7636, S256). */
export interface Pkce {
  challenge: string
  method: 'S256'
  verifier: string
}

/** Generate a PKCE `code_verifier`/`code_challenge` pair using SHA-256 (S256). */
export async function generatePkce(): Promise<Pkce> {
  const verifier = randomUrlToken(64)
  const data = new TextEncoder().encode(verifier)
  const digest = await getCrypto().subtle.digest('SHA-256', data)
  const challenge = base64UrlEncode(new Uint8Array(digest))
  return { verifier, challenge, method: 'S256' }
}

function getCrypto(): Crypto {
  const c = globalThis.crypto
  if (!c?.subtle) {
    throw new Error(
      'WebCrypto (globalThis.crypto.subtle) is unavailable. On React Native, ' +
        'polyfill it (e.g. `react-native-get-random-values`).'
    )
  }
  return c
}

/** Random URL-safe token of `byteLength` random bytes, base64url-encoded. */
function randomUrlToken(byteLength: number): string {
  const bytes = new Uint8Array(byteLength)
  getCrypto().getRandomValues(bytes)
  return base64UrlEncode(bytes)
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  const base64 = typeof btoa === 'function' ? btoa(binary) : bufferToBase64(binary)
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function bufferToBase64(binary: string): string {
  const g = globalThis as {
    Buffer?: { from(data: string, encoding: string): { toString(encoding: string): string } }
  }
  if (!g.Buffer) {
    throw new Error('No base64 encoder available (need `btoa` or Node `Buffer`).')
  }
  return g.Buffer.from(binary, 'binary').toString('base64')
}
