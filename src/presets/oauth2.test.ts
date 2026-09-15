import { describe, expect, it, vi } from 'vitest'
import { createOAuth2Auth, type OAuth2TokenStore } from './oauth2'

function tokenStore(): OAuth2TokenStore & { current: Parameters<OAuth2TokenStore['set']>[0] } {
  const store = {
    current: null as Parameters<OAuth2TokenStore['set']>[0],
    get: () => store.current,
    set: (tokens: Parameters<OAuth2TokenStore['set']>[0]) => {
      store.current = tokens
    },
  }
  return store
}

describe('createOAuth2Auth', () => {
  it('classifies rate limiting as unreachable without clearing tokens', async () => {
    const store = tokenStore()
    store.current = { accessToken: 'access', refreshToken: 'refresh' }
    const auth = createOAuth2Auth({
      clientId: 'desktop',
      fetch: vi.fn(async () => new Response('{"error":"slow_down"}', { status: 429 })),
      store,
      tokenEndpoint: 'https://api.test/oauth2/token',
    })

    await expect(auth.refreshSession()).resolves.toBe('unreachable')
    expect(store.current).toEqual({ accessToken: 'access', refreshToken: 'refresh' })
  })

  it('classifies invalid_grant as denied', async () => {
    const store = tokenStore()
    store.current = { accessToken: 'access', refreshToken: 'refresh' }
    const auth = createOAuth2Auth({
      clientId: 'desktop',
      fetch: vi.fn(async () => new Response('{"error":"invalid_grant"}', { status: 400 })),
      store,
      tokenEndpoint: 'https://api.test/oauth2/token',
    })

    await expect(auth.refreshSession()).resolves.toBe('denied')
    expect(store.current).toEqual({ accessToken: 'access', refreshToken: 'refresh' })
  })

  it('clears local tokens before a revocation request settles', async () => {
    const store = tokenStore()
    store.current = { accessToken: 'access', refreshToken: 'refresh' }
    const fetchMock = vi.fn(() => new Promise<Response>(() => undefined))
    const auth = createOAuth2Auth({
      clientId: 'desktop',
      fetch: fetchMock,
      revocationEndpoint: 'https://api.test/oauth2/revoke',
      store,
      tokenEndpoint: 'https://api.test/oauth2/token',
    })

    await expect(auth.logout()).resolves.toBeUndefined()
    expect(store.current).toBeNull()
    expect(fetchMock).toHaveBeenCalledOnce()
  })
})
