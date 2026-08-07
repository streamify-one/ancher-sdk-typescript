import { describe, expect, it, vi } from 'vitest'
import {
  createTokenManager,
  type ManagedTokens,
  memoryTokenStore,
  type TokenStore,
} from './token-manager'

/** A `TokenStore` backed by a plain in-memory variable, for assertions. */
function fakeStore(initial: ManagedTokens | null = null): TokenStore & {
  current: ManagedTokens | null
} {
  const store = {
    current: initial,
    get: () => store.current,
    set: (next: ManagedTokens | null) => {
      store.current = next
    },
  }
  return store
}

/** A promise whose resolution is controlled externally. */
function deferred<T>(): {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason?: unknown) => void
} {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

/** Let pending microtasks/macrotasks drain (e.g. an awaited store read). */
const flush = (): Promise<void> => new Promise(resolve => setTimeout(resolve, 0))

const accessTokens = (tokens: ManagedTokens): string => tokens.accessToken

describe('createTokenManager', () => {
  describe('concurrent refresh de-duplication', () => {
    it('runs the underlying refresh exactly once for a burst of concurrent calls', async () => {
      const store = fakeStore({ accessToken: 'old', refreshToken: 'r1' })
      const gate = deferred<ManagedTokens | null>()
      const refresh = vi.fn((_current: ManagedTokens) => gate.promise)

      const manager = createTokenManager({ store, refresh })

      // Fire several refreshes before any resolves.
      const calls = [manager.refresh(), manager.refresh(), manager.refresh(), manager.refresh()]

      // Let the first refresh reach the (still-pending) underlying call.
      await flush()

      // The slow refresh has not resolved yet, so only one underlying call
      // should be in flight regardless of how many callers piled on.
      expect(refresh).toHaveBeenCalledTimes(1)
      expect(refresh).toHaveBeenCalledWith({ accessToken: 'old', refreshToken: 'r1' })

      gate.resolve({ accessToken: 'new', refreshToken: 'r2' })

      const results = await Promise.all(calls)

      // All callers observed the same successful result.
      expect(results).toEqual([true, true, true, true])
      expect(refresh).toHaveBeenCalledTimes(1)
      // The store was updated to the refreshed tokens.
      expect(store.current).toEqual({ accessToken: 'new', refreshToken: 'r2' })
    })

    it('starts a fresh refresh after the in-flight one settles', async () => {
      const store = fakeStore({ accessToken: 'old' })
      const refresh = vi
        .fn<(current: ManagedTokens) => Promise<ManagedTokens | null>>()
        .mockResolvedValueOnce({ accessToken: 'v2' })
        .mockResolvedValueOnce({ accessToken: 'v3' })

      const manager = createTokenManager({ store, refresh })

      expect(await manager.refresh()).toBe(true)
      expect(store.current).toEqual({ accessToken: 'v2' })

      // Now that the first refresh settled, a second refresh is a new call.
      expect(await manager.refresh()).toBe(true)
      expect(store.current).toEqual({ accessToken: 'v3' })
      expect(refresh).toHaveBeenCalledTimes(2)
    })
  })

  describe('refresh outcomes', () => {
    it('updates the store and returns true on success', async () => {
      const store = fakeStore({ accessToken: 'old', refreshToken: 'r' })
      const refresh = vi.fn(async () => ({ accessToken: 'fresh', refreshToken: 'r2', expiresAt: 123 }))

      const manager = createTokenManager({ store, refresh })

      expect(await manager.refresh()).toBe(true)
      expect(store.current).toEqual({ accessToken: 'fresh', refreshToken: 'r2', expiresAt: 123 })
    })

    it('returns false without invoking refresh when there are no stored tokens', async () => {
      const store = fakeStore(null)
      const refresh = vi.fn(async () => ({ accessToken: 'nope' }))

      const manager = createTokenManager({ store, refresh })

      expect(await manager.refresh()).toBe(false)
      expect(refresh).not.toHaveBeenCalled()
      expect(store.current).toBeNull()
    })

    it('returns false and leaves the store untouched when refresh yields null', async () => {
      const store = fakeStore({ accessToken: 'old' })
      const refresh = vi.fn(async () => null)

      const manager = createTokenManager({ store, refresh })

      expect(await manager.refresh()).toBe(false)
      expect(store.current).toEqual({ accessToken: 'old' })
    })

    it('swallows a thrown refresh and returns false', async () => {
      const store = fakeStore({ accessToken: 'old' })
      const refresh = vi.fn(async () => {
        throw new Error('network down')
      })

      const manager = createTokenManager({ store, refresh })

      expect(await manager.refresh()).toBe(false)
      expect(store.current).toEqual({ accessToken: 'old' })
    })

    it('recovers after a failed refresh and can succeed on the next call', async () => {
      const store = fakeStore({ accessToken: 'old' })
      const refresh = vi
        .fn<(current: ManagedTokens) => Promise<ManagedTokens | null>>()
        .mockRejectedValueOnce(new Error('boom'))
        .mockResolvedValueOnce({ accessToken: 'recovered' })

      const manager = createTokenManager({ store, refresh })

      expect(await manager.refresh()).toBe(false)
      expect(await manager.refresh()).toBe(true)
      expect(store.current).toEqual({ accessToken: 'recovered' })
    })
  })

  describe('getAccessToken proactive refresh', () => {
    it('returns null when unauthenticated', async () => {
      const manager = createTokenManager({ store: fakeStore(null), refresh: vi.fn() })
      expect(await manager.getAccessToken()).toBeNull()
    })

    it('returns the current token without refreshing when expiry is unknown', async () => {
      const store = fakeStore({ accessToken: 'live' })
      const refresh = vi.fn(async () => ({ accessToken: 'other' }))

      const manager = createTokenManager({ store, refresh })

      expect(await manager.getAccessToken()).toBe('live')
      expect(refresh).not.toHaveBeenCalled()
    })

    it('returns the current token without refreshing when it is comfortably fresh', async () => {
      const store = fakeStore({ accessToken: 'live', expiresAt: Date.now() + 60 * 60 * 1000 })
      const refresh = vi.fn(async () => ({ accessToken: 'other' }))

      const manager = createTokenManager({ store, refresh })

      expect(await manager.getAccessToken()).toBe('live')
      expect(refresh).not.toHaveBeenCalled()
    })

    it('proactively refreshes when the token is already expired', async () => {
      const store = fakeStore({ accessToken: 'stale', expiresAt: Date.now() - 1000 })
      const refresh = vi.fn(async (current: ManagedTokens) => ({
        accessToken: 'renewed',
        refreshToken: current.refreshToken,
      }))

      const manager = createTokenManager({ store, refresh })

      expect(await manager.getAccessToken()).toBe('renewed')
      expect(refresh).toHaveBeenCalledTimes(1)
      expect(accessTokens(store.current as ManagedTokens)).toBe('renewed')
    })

    it('proactively refreshes when the token is within the default leeway window', async () => {
      // The shared SDK default leeway is 120s; a token expiring in 90s is
      // stale under it (and would NOT be under the old 60s default — this
      // offset pins the unified constant).
      const store = fakeStore({ accessToken: 'nearly', expiresAt: Date.now() + 90 * 1000 })
      const refresh = vi.fn(async () => ({ accessToken: 'renewed' }))

      const manager = createTokenManager({ store, refresh })

      expect(await manager.getAccessToken()).toBe('renewed')
      expect(refresh).toHaveBeenCalledTimes(1)
    })

    it('honors a custom expiryLeewaySeconds threshold', async () => {
      // With a 5-minute leeway, a token expiring in 2 minutes is stale.
      const store = fakeStore({ accessToken: 'soon', expiresAt: Date.now() + 2 * 60 * 1000 })
      const refresh = vi.fn(async () => ({ accessToken: 'renewed' }))

      const manager = createTokenManager({ store, refresh, expiryLeewaySeconds: 300 })

      expect(await manager.getAccessToken()).toBe('renewed')
      expect(refresh).toHaveBeenCalledTimes(1)
    })

    it('keeps returning the stale token when a proactive refresh fails', async () => {
      const store = fakeStore({ accessToken: 'stale', expiresAt: Date.now() - 1000 })
      const refresh = vi.fn(async () => null)

      const manager = createTokenManager({ store, refresh })

      // Refresh failed, so the (stale) token is surfaced for the 401 path to retry.
      expect(await manager.getAccessToken()).toBe('stale')
      expect(refresh).toHaveBeenCalledTimes(1)
    })

    it('de-duplicates the refresh triggered by concurrent getAccessToken calls', async () => {
      const store = fakeStore({ accessToken: 'stale', expiresAt: Date.now() - 1000 })
      const gate = deferred<ManagedTokens | null>()
      const refresh = vi.fn(() => gate.promise)

      const manager = createTokenManager({ store, refresh })

      const calls = [manager.getAccessToken(), manager.getAccessToken(), manager.getAccessToken()]
      await flush()
      expect(refresh).toHaveBeenCalledTimes(1)

      gate.resolve({ accessToken: 'renewed', expiresAt: Date.now() + 60 * 60 * 1000 })

      expect(await Promise.all(calls)).toEqual(['renewed', 'renewed', 'renewed'])
      expect(refresh).toHaveBeenCalledTimes(1)
    })
  })

  describe('authConfig', () => {
    it('exposes getAccessToken, refreshSession, and omit credentials', async () => {
      const store = fakeStore({ accessToken: 'tok' })
      const manager = createTokenManager({ store, refresh: vi.fn() })

      expect(manager.authConfig.credentials).toBe('omit')
      expect(await manager.authConfig.getAccessToken?.()).toBe('tok')
      // refreshSession is the same de-duplicating refresh used reactively on 401.
      expect(manager.authConfig.refreshSession).toBe(manager.refresh)
    })

    it('supplies getSessionExpiresAt from the store for the transport scheduler', async () => {
      const expiresAt = Date.now() + 10 * 60 * 1000
      const store = fakeStore({ accessToken: 'tok', expiresAt })
      const manager = createTokenManager({ store, refresh: vi.fn() })

      expect(await manager.authConfig.getSessionExpiresAt?.()).toBe(expiresAt)

      await manager.setTokens(null)
      expect(await manager.authConfig.getSessionExpiresAt?.()).toBeNull()
    })

    it('forwards its leeway to the transport scheduler', async () => {
      // A custom expiryLeewaySeconds must govern request-time (transport)
      // refresh too, not just the manager's internal backstop — including 0
      // ("only refresh once actually expired").
      const custom = createTokenManager({ store: fakeStore(null), refresh: vi.fn(), expiryLeewaySeconds: 300 })
      expect(custom.authConfig.refreshLeewaySeconds).toBe(300)

      const zero = createTokenManager({ store: fakeStore(null), refresh: vi.fn(), expiryLeewaySeconds: 0 })
      expect(zero.authConfig.refreshLeewaySeconds).toBe(0)

      const defaulted = createTokenManager({ store: fakeStore(null), refresh: vi.fn() })
      expect(defaulted.authConfig.refreshLeewaySeconds).toBe(120)
    })

    it('hands the transport a PLAIN token read — no refresh, even when stale', async () => {
      // The transport owns refresh timing (proactive scheduler + reactive
      // 401 + failure cooldown); a refreshing getter here would fire an
      // ungated extra refresh per request while refreshes are failing.
      const store = fakeStore({ accessToken: 'stale', expiresAt: Date.now() - 1000 })
      const refresh = vi.fn(async () => ({ accessToken: 'renewed' }))
      const manager = createTokenManager({ store, refresh })

      expect(await manager.authConfig.getAccessToken?.()).toBe('stale')
      expect(refresh).not.toHaveBeenCalled()

      // The manager's own surface keeps the refreshing variant for direct
      // callers outside the transport.
      expect(await manager.getAccessToken()).toBe('renewed')
      expect(refresh).toHaveBeenCalledTimes(1)
    })
  })

  describe('getTokens / setTokens', () => {
    it('reads and writes tokens through the store', async () => {
      const store = fakeStore(null)
      const manager = createTokenManager({ store, refresh: vi.fn() })

      expect(await manager.getTokens()).toBeNull()

      await manager.setTokens({ accessToken: 'a', refreshToken: 'b' })
      expect(store.current).toEqual({ accessToken: 'a', refreshToken: 'b' })
      expect(await manager.getTokens()).toEqual({ accessToken: 'a', refreshToken: 'b' })

      await manager.setTokens(null)
      expect(store.current).toBeNull()
      expect(await manager.getTokens()).toBeNull()
    })

    it('defaults to an in-memory store when none is provided', async () => {
      const refresh = vi.fn(async () => ({ accessToken: 'fresh' }))
      const manager = createTokenManager({ refresh })

      expect(await manager.getTokens()).toBeNull()
      await manager.setTokens({ accessToken: 'seed' })
      expect(await manager.getAccessToken()).toBe('seed')
    })
  })

  describe('memoryTokenStore', () => {
    it('round-trips tokens and clears on null', async () => {
      const store = memoryTokenStore()

      expect(await store.get()).toBeNull()

      await store.set({ accessToken: 'x' })
      expect(await store.get()).toEqual({ accessToken: 'x' })

      await store.set(null)
      expect(await store.get()).toBeNull()
    })
  })
})
