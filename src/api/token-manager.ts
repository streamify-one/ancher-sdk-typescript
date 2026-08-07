/**
 * Token lifecycle manager — the shared core behind the OAuth2 preset (and any
 * custom token-bearing auth flow).
 *
 * It owns everything that's identical across token-bearing auth schemes:
 * holding the access + refresh tokens, **proactive** renewal (refresh when the
 * access token is within `expiryLeewaySeconds` of expiry, checked lazily on each
 * `getAccessToken`), **reactive** renewal (the `refreshSession` hook the
 * transport calls on a 401), de-duplication of concurrent refreshes, and
 * pluggable storage. The only thing that differs between schemes — *how* a
 * refresh is actually performed — is injected as {@link TokenManagerOptions.refresh}.
 *
 * Auth flows layer their scheme-specific acquisition (e.g. the OAuth2 preset's
 * PKCE code exchange) on top and delegate the lifecycle here.
 */

import { DEFAULT_REFRESH_LEEWAY_SECONDS } from './auth'
import type { AncherClientConfig, MaybePromise } from './config'

/** A managed token set. */
export interface ManagedTokens {
  accessToken: string
  /** Epoch milliseconds at which {@link accessToken} expires, if known. */
  expiresAt?: number
  refreshToken?: string
  scope?: string
  tokenType?: string
}

/**
 * Pluggable token persistence. Defaults to in-memory (lost on reload). Back it
 * with secure storage on mobile (Keychain / Keystore) or `chrome.storage` in a
 * browser extension.
 */
export interface TokenStore {
  get(): MaybePromise<ManagedTokens | null>
  set(tokens: ManagedTokens | null): MaybePromise<void>
}

export interface TokenManagerOptions {
  /**
   * Treat the access token as stale this many seconds *before* its actual
   * expiry, so renewal happens proactively instead of mid-request. Defaults to
   * the SDK-wide {@link DEFAULT_REFRESH_LEEWAY_SECONDS} (120) — the same clock
   * the transport's proactive scheduler runs on.
   */
  expiryLeewaySeconds?: number
  /**
   * Perform a refresh given the current tokens. Return the new token set, or
   * `null` if a refresh isn't possible (e.g. no refresh token) — the manager
   * treats `null`/throw as a failed refresh and surfaces the original error.
   */
  refresh: (current: ManagedTokens) => Promise<ManagedTokens | null>
  /** Token persistence. Defaults to in-memory. */
  store?: TokenStore
}

export interface TokenManager {
  /**
   * Spread into {@link createAncherClient}'s config — provides a plain-read
   * `getAccessToken` (the transport owns refresh timing), `refreshSession`,
   * `getSessionExpiresAt` + `refreshLeewaySeconds` (drive the transport's
   * proactive refresh from the store's `expiresAt`, on the manager's leeway),
   * and `credentials: 'omit'` (token auth, no cookies).
   */
  authConfig: Pick<
    AncherClientConfig,
    | 'getAccessToken'
    | 'refreshSession'
    | 'getSessionExpiresAt'
    | 'refreshLeewaySeconds'
    | 'credentials'
  >
  /**
   * The current access token for **direct callers** (hand-built requests
   * outside the transport), refreshing first if it's stale. `null` if
   * unauthenticated. The transport instead gets a plain store read via
   * {@link authConfig} and runs its own scheduler.
   */
  getAccessToken(): Promise<string | null>
  /** The currently stored tokens, if any. */
  getTokens(): Promise<ManagedTokens | null>
  /** Force a refresh now. Returns `true` on success. De-duplicates concurrent calls. */
  refresh(): Promise<boolean>
  /** Store a token set (or `null` to clear). */
  setTokens(tokens: ManagedTokens | null): Promise<void>
}

/** A simple in-memory {@link TokenStore} (the default). */
export function memoryTokenStore(): TokenStore {
  let tokens: ManagedTokens | null = null
  return {
    get: () => tokens,
    set: next => {
      tokens = next
    },
  }
}

/** Create a {@link TokenManager}. See the module doc for the division of labour. */
export function createTokenManager(options: TokenManagerOptions): TokenManager {
  const store = options.store ?? memoryTokenStore()
  const leewaySeconds = options.expiryLeewaySeconds ?? DEFAULT_REFRESH_LEEWAY_SECONDS
  const leewayMs = leewaySeconds * 1000

  let refreshInFlight: Promise<boolean> | null = null

  function isStale(tokens: ManagedTokens): boolean {
    if (tokens.expiresAt == null) return false
    return Date.now() >= tokens.expiresAt - leewayMs
  }

  async function refresh(): Promise<boolean> {
    // De-duplicate concurrent refreshes: a burst of requests triggers one
    // refresh, and all of them await the same promise.
    if (refreshInFlight) return refreshInFlight
    refreshInFlight = (async () => {
      try {
        const current = await store.get()
        if (!current) return false
        const next = await options.refresh(current)
        if (!next) return false
        await store.set(next)
        return true
      } catch {
        return false
      } finally {
        refreshInFlight = null
      }
    })()
    return refreshInFlight
  }

  async function getAccessToken(): Promise<string | null> {
    const tokens = await store.get()
    if (!tokens) return null
    if (isStale(tokens)) {
      await refresh()
      const fresh = await store.get()
      // If refresh failed we still return the (stale) token; the transport's
      // 401 path will trigger one more refresh attempt before surfacing.
      return fresh?.accessToken ?? tokens.accessToken
    }
    return tokens.accessToken
  }

  return {
    authConfig: {
      // A PLAIN store read, not the refreshing getAccessToken: the transport
      // owns the refresh lifecycle (proactive via getSessionExpiresAt below,
      // reactive on 401), including the failure cooldown. Handing it the
      // refreshing variant would fire an ungated extra refresh per request
      // whenever the token is stale and refreshes are failing — exactly what
      // the cooldown exists to prevent.
      getAccessToken: async () => (await store.get())?.accessToken ?? null,
      refreshSession: refresh,
      // The transport's proactive scheduler reads expiry straight off the
      // store, so every token-manager client refreshes ahead of expiry with
      // no host wiring — on the manager's leeway, so a custom
      // expiryLeewaySeconds governs request-time refresh too.
      getSessionExpiresAt: async () => (await store.get())?.expiresAt ?? null,
      refreshLeewaySeconds: leewaySeconds,
      credentials: 'omit',
    },
    getAccessToken,
    getTokens: () => Promise.resolve(store.get()),
    setTokens: tokens => Promise.resolve(store.set(tokens)),
    refresh,
  }
}
