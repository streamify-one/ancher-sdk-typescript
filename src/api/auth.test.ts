import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AncherClientConfig } from './config'
import { AncherApiError } from './errors'
import {
  applyAuthHeader,
  buildContextHeaders,
  ensureFreshSession,
  requestSignal,
  sendWithAuthRetry,
} from './auth'

/** Build a `Response` from a JSON body with the given status. */
function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status })
}

/** A minimal config; every hook is opt-in per test. */
function makeConfig(overrides: Partial<AncherClientConfig> = {}): AncherClientConfig {
  return { ...overrides }
}

/** The wire grammar the API's `traceparent` parser accepts. */
const TRACEPARENT = /^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/

const traceOf = (headers: Record<string, string>) => headers.traceparent?.split('-')[1]
const spanOf = (headers: Record<string, string>) => headers.traceparent?.split('-')[2]

describe('sendWithAuthRetry', () => {
  it('401 → refreshSession() true → retries once and returns the fresh 200', async () => {
    const send = vi
      .fn<() => Promise<Response>>()
      .mockResolvedValueOnce(jsonResponse({}, 401))
      .mockResolvedValueOnce(jsonResponse({ ok: true }, 200))
    const refreshSession = vi.fn().mockResolvedValue(true)
    const config = makeConfig({ refreshSession })

    const response = await sendWithAuthRetry(config, send)

    expect(refreshSession).toHaveBeenCalledTimes(1)
    expect(send).toHaveBeenCalledTimes(2)
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ ok: true })
  })

  it('401 → refreshSession() false → does not retry', async () => {
    const send = vi
      .fn<() => Promise<Response>>()
      .mockResolvedValue(jsonResponse({}, 401))
    const refreshSession = vi.fn().mockResolvedValue(false)
    const onError = vi.fn()
    const config = makeConfig({ refreshSession, onError })

    const response = await sendWithAuthRetry(config, send)

    expect(refreshSession).toHaveBeenCalledTimes(1)
    expect(send).toHaveBeenCalledTimes(1)
    expect(response.status).toBe(401)
    // The unresolved 401 is still a non-2xx, so onError fires with the error.
    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError.mock.calls[0]?.[0]).toBeInstanceOf(AncherApiError)
  })

  it('403 activation gate (API-USR010) → onActivationRequired "retry" → retries once', async () => {
    const send = vi
      .fn<() => Promise<Response>>()
      .mockResolvedValueOnce(
        jsonResponse(
          { error: { code: 'API-USR010', message: 'Activation required' } },
          403
        )
      )
      .mockResolvedValueOnce(jsonResponse({ ok: true }, 200))
    const onActivationRequired = vi.fn().mockResolvedValue('retry')
    const config = makeConfig({ onActivationRequired })

    const response = await sendWithAuthRetry(config, send)

    expect(onActivationRequired).toHaveBeenCalledTimes(1)
    // Invoked with the original 403 response.
    expect(onActivationRequired.mock.calls[0]?.[0]).toBeInstanceOf(Response)
    expect(send).toHaveBeenCalledTimes(2)
    expect(response.status).toBe(200)
  })

  it('403 activation gate → onActivationRequired null → does not retry', async () => {
    const send = vi
      .fn<() => Promise<Response>>()
      .mockResolvedValue(
        jsonResponse(
          { error: { code: 'API-USR010', message: 'Activation required' } },
          403
        )
      )
    const onActivationRequired = vi.fn().mockResolvedValue(null)
    const config = makeConfig({ onActivationRequired })

    const response = await sendWithAuthRetry(config, send)

    expect(onActivationRequired).toHaveBeenCalledTimes(1)
    expect(send).toHaveBeenCalledTimes(1)
    expect(response.status).toBe(403)
  })

  it('403 without the activation code → onActivationRequired is not consulted', async () => {
    const send = vi
      .fn<() => Promise<Response>>()
      .mockResolvedValue(
        jsonResponse({ error: { code: 'API-USR001', message: 'Forbidden' } }, 403)
      )
    const onActivationRequired = vi.fn().mockResolvedValue('retry')
    const config = makeConfig({ onActivationRequired })

    const response = await sendWithAuthRetry(config, send)

    expect(onActivationRequired).not.toHaveBeenCalled()
    expect(send).toHaveBeenCalledTimes(1)
    expect(response.status).toBe(403)
  })

  it('non-2xx → onError fires with an AncherApiError and it throws when throwOnStatusError is true', async () => {
    const send = vi
      .fn<() => Promise<Response>>()
      .mockResolvedValue(
        jsonResponse({ error: { code: 'API-SRV001', message: 'Boom' } }, 500)
      )
    const onError = vi.fn()
    const config = makeConfig({ onError })

    await expect(
      sendWithAuthRetry(config, send, { throwOnStatusError: true })
    ).rejects.toBeInstanceOf(AncherApiError)

    expect(onError).toHaveBeenCalledTimes(1)
    const error = onError.mock.calls[0]?.[0] as AncherApiError
    expect(error).toBeInstanceOf(AncherApiError)
    expect(error.status).toBe(500)
    expect(error.code).toBe('API-SRV001')
    expect(error.message).toBe('Boom')
  })

  it('non-2xx → returns the response (does not throw) when throwOnStatusError is false, onError still fires', async () => {
    const send = vi
      .fn<() => Promise<Response>>()
      .mockResolvedValue(
        jsonResponse({ error: { code: 'API-BIS002', message: 'No credits' } }, 402)
      )
    const onError = vi.fn()
    const config = makeConfig({ onError })

    const response = await sendWithAuthRetry(config, send, {
      throwOnStatusError: false,
    })

    expect(response.status).toBe(402)
    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError.mock.calls[0]?.[0]).toBeInstanceOf(AncherApiError)
  })

  it('uses the errorMessage fallback for the normalized error', async () => {
    // A non-JSON body so buildApiError falls back to the supplied message.
    const send = vi
      .fn<() => Promise<Response>>()
      .mockResolvedValue(new Response('not json', { status: 500 }))
    const onError = vi.fn()
    const config = makeConfig({ onError })

    await sendWithAuthRetry(config, send, {
      errorMessage: () => 'custom fallback',
    })

    const error = onError.mock.calls[0]?.[0] as AncherApiError
    expect(error.message).toBe('custom fallback')
  })
})

describe('proactive session refresh', () => {
  const NOW = 1_700_000_000_000
  /** Inside the default 120 s leeway (60 s to expiry). */
  const STALE_EXPIRY = NOW + 60_000
  /** Well outside the leeway (10 min to expiry). */
  const FRESH_EXPIRY = NOW + 600_000

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function deferred<T>() {
    let resolve!: (value: T) => void
    let reject!: (reason?: unknown) => void
    const promise = new Promise<T>((res, rej) => {
      resolve = res
      reject = rej
    })
    return { promise, resolve, reject }
  }

  const okSend = () =>
    vi.fn<() => Promise<Response>>().mockResolvedValue(jsonResponse({ ok: true }, 200))

  it('refreshes before the request when the expiry is within the leeway', async () => {
    const send = okSend()
    const refreshSession = vi.fn().mockResolvedValue(true)
    const config = makeConfig({ refreshSession, getSessionExpiresAt: () => STALE_EXPIRY })

    const response = await sendWithAuthRetry(config, send)

    expect(refreshSession).toHaveBeenCalledTimes(1)
    expect(send).toHaveBeenCalledTimes(1)
    // Proactive: the refresh ran strictly before the request went out.
    expect(refreshSession.mock.invocationCallOrder[0]).toBeLessThan(
      send.mock.invocationCallOrder[0] as number
    )
    expect(response.status).toBe(200)
  })

  it('does not refresh when the expiry is outside the leeway', async () => {
    const send = okSend()
    const refreshSession = vi.fn().mockResolvedValue(true)
    const config = makeConfig({ refreshSession, getSessionExpiresAt: () => FRESH_EXPIRY })

    await sendWithAuthRetry(config, send)

    expect(refreshSession).not.toHaveBeenCalled()
  })

  it('is a no-op when expiry is unknown, the hook is absent, or refreshSession is absent', async () => {
    const refreshSession = vi.fn().mockResolvedValue(true)

    // Unknown expiry.
    const nullExpiry = okSend()
    await sendWithAuthRetry(
      makeConfig({ refreshSession, getSessionExpiresAt: () => null }),
      nullExpiry
    )
    expect(refreshSession).not.toHaveBeenCalled()

    // No expiry hook at all.
    const noHook = okSend()
    await sendWithAuthRetry(makeConfig({ refreshSession }), noHook)
    expect(refreshSession).not.toHaveBeenCalled()

    // No refresh mechanism: the expiry hook must not even be consulted.
    const getSessionExpiresAt = vi.fn(() => STALE_EXPIRY)
    const noMechanism = okSend()
    await sendWithAuthRetry(makeConfig({ getSessionExpiresAt }), noMechanism)
    expect(getSessionExpiresAt).not.toHaveBeenCalled()
  })

  it('honors a custom refreshLeewaySeconds', async () => {
    const refreshSession = vi.fn().mockResolvedValue(true)

    // 30 s leeway: 60 s to expiry is still fresh.
    await sendWithAuthRetry(
      makeConfig({
        refreshSession,
        getSessionExpiresAt: () => STALE_EXPIRY,
        refreshLeewaySeconds: 30,
      }),
      okSend()
    )
    expect(refreshSession).not.toHaveBeenCalled()

    // 600 s leeway: 5 min to expiry is stale.
    await sendWithAuthRetry(
      makeConfig({
        refreshSession,
        getSessionExpiresAt: () => NOW + 300_000,
        refreshLeewaySeconds: 600,
      }),
      okSend()
    )
    expect(refreshSession).toHaveBeenCalledTimes(1)
  })

  it('de-duplicates concurrent proactive refreshes on the same client', async () => {
    const gate = deferred<boolean>()
    const refreshSession = vi.fn().mockReturnValue(gate.promise)
    const config = makeConfig({ refreshSession, getSessionExpiresAt: () => STALE_EXPIRY })
    const sendA = okSend()
    const sendB = okSend()

    const a = sendWithAuthRetry(config, sendA)
    const b = sendWithAuthRetry(config, sendB)
    gate.resolve(true)
    await Promise.all([a, b])

    expect(refreshSession).toHaveBeenCalledTimes(1)
    expect(sendA).toHaveBeenCalledTimes(1)
    expect(sendB).toHaveBeenCalledTimes(1)
  })

  it('applies a cooldown after a failed refresh, then tries again once it lapses', async () => {
    const refreshSession = vi.fn().mockResolvedValue(false)
    const config = makeConfig({ refreshSession, getSessionExpiresAt: () => Date.now() + 60_000 })

    // The failed refresh must not fail the request — the credential may still
    // be valid inside the leeway window.
    const first = await sendWithAuthRetry(config, okSend())
    expect(first.status).toBe(200)
    expect(refreshSession).toHaveBeenCalledTimes(1)

    vi.setSystemTime(NOW + 10_000)
    await sendWithAuthRetry(config, okSend())
    expect(refreshSession).toHaveBeenCalledTimes(1) // within cooldown — quiet

    vi.setSystemTime(NOW + 31_000)
    await sendWithAuthRetry(config, okSend())
    expect(refreshSession).toHaveBeenCalledTimes(2) // cooldown lapsed
  })

  it('a failed reactive 401 refresh arms the proactive cooldown', async () => {
    const refreshSession = vi.fn().mockResolvedValue(false)
    const expiry = vi
      .fn<() => number>()
      .mockReturnValueOnce(FRESH_EXPIRY) // request 1: fresh, no proactive
      .mockReturnValue(STALE_EXPIRY) // request 2: stale, but cooldown holds
    const config = makeConfig({ refreshSession, getSessionExpiresAt: expiry })

    const send401 = vi.fn<() => Promise<Response>>().mockResolvedValue(jsonResponse({}, 401))
    await sendWithAuthRetry(config, send401)
    expect(refreshSession).toHaveBeenCalledTimes(1) // the reactive attempt

    vi.setSystemTime(NOW + 5_000)
    await sendWithAuthRetry(config, okSend())
    expect(refreshSession).toHaveBeenCalledTimes(1) // proactive suppressed
  })

  it('a successful refresh clears the cooldown', async () => {
    const refreshSession = vi
      .fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValue(true)
    const config = makeConfig({ refreshSession, getSessionExpiresAt: () => Date.now() + 60_000 })

    await sendWithAuthRetry(config, okSend()) // proactive fails, arms cooldown
    expect(refreshSession).toHaveBeenCalledTimes(1)

    // A reactive 401 refresh (never cooldown-gated) succeeds INSIDE the
    // cooldown window and must clear it.
    vi.setSystemTime(NOW + 5_000)
    const send401 = vi
      .fn<() => Promise<Response>>()
      .mockResolvedValueOnce(jsonResponse({}, 401))
      .mockResolvedValueOnce(jsonResponse({ ok: true }, 200))
    await sendWithAuthRetry(config, send401)
    expect(refreshSession).toHaveBeenCalledTimes(2)

    // Still within 30s of the ORIGINAL failure: were the cooldown not
    // cleared by the success above, this proactive refresh would be
    // suppressed.
    vi.setSystemTime(NOW + 10_000)
    await sendWithAuthRetry(config, okSend())
    expect(refreshSession).toHaveBeenCalledTimes(3)
  })

  it('an advanced expiry after a refresh stops further proactive refreshes', async () => {
    const refreshSession = vi.fn().mockResolvedValue(true)
    const expiry = vi
      .fn<() => number>()
      .mockReturnValueOnce(STALE_EXPIRY)
      .mockReturnValue(FRESH_EXPIRY) // the refresh restamped it
    const config = makeConfig({ refreshSession, getSessionExpiresAt: expiry })

    await sendWithAuthRetry(config, okSend())
    await sendWithAuthRetry(config, okSend())

    expect(refreshSession).toHaveBeenCalledTimes(1)
  })

  it('a reactive 401 joins an in-flight proactive refresh instead of racing it', async () => {
    const gate = deferred<boolean>()
    const refreshSession = vi.fn().mockReturnValue(gate.promise)
    const expiry = vi
      .fn<() => number>()
      .mockReturnValueOnce(STALE_EXPIRY) // request A: proactive, holds the gate
      .mockReturnValue(FRESH_EXPIRY) // request B: fresh, sends immediately
    const config = makeConfig({ refreshSession, getSessionExpiresAt: expiry })

    const sendA = okSend()
    const sendB = vi
      .fn<() => Promise<Response>>()
      .mockResolvedValueOnce(jsonResponse({}, 401))
      .mockResolvedValueOnce(jsonResponse({ ok: true }, 200))

    const a = sendWithAuthRetry(config, sendA)
    const b = sendWithAuthRetry(config, sendB)
    // Let B's first attempt fire and hit the 401 before releasing the refresh.
    await vi.waitFor(() => expect(sendB).toHaveBeenCalledTimes(1))
    gate.resolve(true)
    const [ra, rb] = await Promise.all([a, b])

    expect(refreshSession).toHaveBeenCalledTimes(1) // shared, not raced
    expect(ra.status).toBe(200)
    expect(rb.status).toBe(200)
    expect(sendB).toHaveBeenCalledTimes(2) // B retried after joining the refresh
  })

  it('a thrown refresh propagates on the reactive path and arms the cooldown', async () => {
    const boom = new Error('refresh exploded')
    const refreshSession = vi.fn().mockRejectedValue(boom)
    const expiry = vi
      .fn<() => number>()
      .mockReturnValueOnce(FRESH_EXPIRY)
      .mockReturnValue(STALE_EXPIRY)
    const config = makeConfig({ refreshSession, getSessionExpiresAt: expiry })

    const send401 = vi.fn<() => Promise<Response>>().mockResolvedValue(jsonResponse({}, 401))
    await expect(sendWithAuthRetry(config, send401)).rejects.toBe(boom)

    vi.setSystemTime(NOW + 5_000)
    await sendWithAuthRetry(config, okSend())
    expect(refreshSession).toHaveBeenCalledTimes(1) // proactive suppressed by cooldown
  })

  it('a thrown refresh is swallowed on the proactive path', async () => {
    const refreshSession = vi.fn().mockRejectedValue(new Error('refresh exploded'))
    const config = makeConfig({ refreshSession, getSessionExpiresAt: () => STALE_EXPIRY })

    const response = await sendWithAuthRetry(config, okSend())

    expect(refreshSession).toHaveBeenCalledTimes(1)
    expect(response.status).toBe(200)
  })

  it('bounds the proactive wait by timeoutMs so a stalled refresh cannot hang requests', async () => {
    const refreshSession = vi.fn().mockReturnValue(new Promise(() => {})) // never settles
    const config = makeConfig({
      refreshSession,
      getSessionExpiresAt: () => STALE_EXPIRY,
      timeoutMs: 5_000,
    })
    const send = okSend()

    const request = sendWithAuthRetry(config, send)
    await vi.advanceTimersByTimeAsync(5_000)
    const response = await request

    // The request proceeded on the still-valid credential; the refresh keeps
    // running in the background for later joiners.
    expect(response.status).toBe(200)
    expect(send).toHaveBeenCalledTimes(1)
    expect(refreshSession).toHaveBeenCalledTimes(1)
  })

  it('bounds the expiry lookup by timeoutMs so a stalled getSessionExpiresAt cannot hang requests', async () => {
    // e.g. a token-manager client whose secure-storage read never resolves —
    // the deadline must cover the lookup itself, not just the refresh wait.
    const refreshSession = vi.fn().mockResolvedValue(true)
    const config = makeConfig({
      refreshSession,
      getSessionExpiresAt: () => new Promise<number>(() => {}), // never settles
      timeoutMs: 5_000,
    })
    const send = okSend()

    const request = sendWithAuthRetry(config, send)
    await vi.advanceTimersByTimeAsync(5_000)
    const response = await request

    expect(response.status).toBe(200)
    expect(send).toHaveBeenCalledTimes(1)
    expect(refreshSession).not.toHaveBeenCalled()
  })

  it('a synchronously-throwing refresh hook does not poison the refresh slot', async () => {
    const boom = new Error('sync throw')
    const refreshSession = vi
      .fn()
      .mockImplementationOnce(() => {
        throw boom
      })
      .mockResolvedValue(true)
    const config = makeConfig({ refreshSession, getSessionExpiresAt: () => FRESH_EXPIRY })

    const send401 = vi.fn<() => Promise<Response>>().mockResolvedValue(jsonResponse({}, 401))
    await expect(sendWithAuthRetry(config, send401)).rejects.toBe(boom)

    // The slot must be cleared after the sync throw — the next reactive 401
    // must invoke the hook again instead of joining the poisoned rejection.
    const send = vi
      .fn<() => Promise<Response>>()
      .mockResolvedValueOnce(jsonResponse({}, 401))
      .mockResolvedValueOnce(jsonResponse({ ok: true }, 200))
    const response = await sendWithAuthRetry(config, send)

    expect(refreshSession).toHaveBeenCalledTimes(2)
    expect(response.status).toBe(200)
  })

  it('a rejecting getSessionExpiresAt skips the proactive path instead of failing the request', async () => {
    const refreshSession = vi.fn().mockResolvedValue(true)
    const config = makeConfig({
      refreshSession,
      getSessionExpiresAt: () => Promise.reject(new Error('storage read failed')),
    })
    const send = okSend()

    const response = await sendWithAuthRetry(config, send)

    // The existing credential may still work — reactive 401 stays the backstop.
    expect(response.status).toBe(200)
    expect(refreshSession).not.toHaveBeenCalled()
  })

  it('bounds the reactive 401 join by timeoutMs so a stalled refresh surfaces the 401', async () => {
    const refreshSession = vi.fn().mockReturnValue(new Promise(() => {})) // never settles
    const config = makeConfig({ refreshSession, timeoutMs: 5_000 })
    const send = vi.fn<() => Promise<Response>>().mockResolvedValue(jsonResponse({}, 401))

    const request = sendWithAuthRetry(config, send)
    await vi.advanceTimersByTimeAsync(5_000)
    const response = await request

    // No retry — the refresh never delivered, so the original 401 is returned
    // at the deadline instead of hanging the operation forever.
    expect(response.status).toBe(401)
    expect(send).toHaveBeenCalledTimes(1)
  })

  it('a caller abort releases a stalled proactive check even without timeoutMs', async () => {
    const refreshSession = vi.fn().mockResolvedValue(true)
    const controller = new AbortController()
    const config = makeConfig({
      refreshSession,
      getSessionExpiresAt: () => new Promise<number>(() => {}), // never settles
    })

    let released = false
    const wait = ensureFreshSession(config, controller.signal).then(() => {
      released = true
    })
    await vi.advanceTimersByTimeAsync(0)
    expect(released).toBe(false)

    controller.abort()
    await wait
    expect(released).toBe(true)
    expect(refreshSession).not.toHaveBeenCalled()
  })

  it('ensureFreshSession is directly callable and shares state with the transport', async () => {
    const refreshSession = vi.fn().mockResolvedValue(false)
    const config = makeConfig({ refreshSession, getSessionExpiresAt: () => Date.now() + 60_000 })

    await ensureFreshSession(config) // fails, arms the shared cooldown
    vi.setSystemTime(NOW + 5_000)
    await sendWithAuthRetry(config, okSend())

    expect(refreshSession).toHaveBeenCalledTimes(1)
  })
})

describe('applyAuthHeader', () => {
  it('sends the bearer token from getAccessToken', async () => {
    const headers: Record<string, string> = {}
    const config = makeConfig({ getAccessToken: () => 'access-tok' })

    await applyAuthHeader(config, headers)

    expect(headers.Authorization).toBe('Bearer access-tok')
  })

  it('falls back to apiKey when getAccessToken yields nothing', async () => {
    const headers: Record<string, string> = {}
    const config = makeConfig({
      apiKey: 'static-key',
      getAccessToken: () => null,
    })

    await applyAuthHeader(config, headers)

    expect(headers.Authorization).toBe('Bearer static-key')
  })

  it('sends the raw token (no Bearer prefix) under a custom apiKeyHeader', async () => {
    const headers: Record<string, string> = {}
    const config = makeConfig({
      apiKeyHeader: 'x-api-key',
      getAccessToken: () => 'raw-tok',
    })

    await applyAuthHeader(config, headers)

    expect(headers['x-api-key']).toBe('raw-tok')
    expect(headers.Authorization).toBeUndefined()
  })

  it('sets no auth header when there is no token', async () => {
    const headers: Record<string, string> = {}
    const config = makeConfig()

    await applyAuthHeader(config, headers)

    expect(headers).toEqual({})
  })
})

describe('buildContextHeaders', () => {
  it('sets CSRF / device / timezone from the hooks and merges getHeaders + the auth header', async () => {
    const config = makeConfig({
      getHeaders: () => ({ 'x-app-version': '1.2.3' }),
      getCsrfToken: () => 'csrf-abc',
      getDeviceId: () => 'device-42',
      getTimezone: () => 'America/New_York',
      getAccessToken: () => 'tok',
    })

    const headers = await buildContextHeaders(config, 'a'.repeat(32))

    expect(headers).toEqual({
      'x-app-version': '1.2.3',
      'X-CSRF-Token': 'csrf-abc',
      'x-device-id': 'device-42',
      'x-timezone': 'America/New_York',
      Authorization: 'Bearer tok',
      traceparent: expect.stringMatching(/^00-a{32}-[0-9a-f]{16}-01$/),
    })
  })

  it('omits headers whose hooks are absent or return nothing (but always traces)', async () => {
    const config = makeConfig({
      getCsrfToken: () => null,
      getDeviceId: () => undefined,
    })

    const headers = await buildContextHeaders(config)

    expect(headers).toEqual({ traceparent: expect.stringMatching(TRACEPARENT) })
  })

  it('reuses the supplied trace id but mints a fresh span id per call', async () => {
    const traceId = 'b'.repeat(32)

    const first = await buildContextHeaders(makeConfig(), traceId)
    const second = await buildContextHeaders(makeConfig(), traceId)

    expect(traceOf(first)).toBe(traceId)
    expect(traceOf(second)).toBe(traceId)
    expect(spanOf(first)).not.toBe(spanOf(second))
  })

  it('starts a new trace when no trace id is supplied', async () => {
    const first = await buildContextHeaders(makeConfig())
    const second = await buildContextHeaders(makeConfig())

    expect(traceOf(first)).not.toBe(traceOf(second))
  })

  it('wins over a traceparent returned by getHeaders (the lowest-precedence layer)', async () => {
    const config = makeConfig({ getHeaders: () => ({ traceparent: 'bogus' }) })

    const headers = await buildContextHeaders(config, 'c'.repeat(32))

    expect(headers.traceparent).toMatch(/^00-c{32}-[0-9a-f]{16}-01$/)
  })
})

describe('requestSignal', () => {
  it('returns undefined with no timeout and no signal', () => {
    const config = makeConfig()

    expect(requestSignal(config)).toBeUndefined()
    expect(requestSignal(config, null)).toBeUndefined()
  })

  it('returns the caller signal untouched when no timeout is configured', () => {
    const config = makeConfig()
    const controller = new AbortController()

    expect(requestSignal(config, controller.signal)).toBe(controller.signal)
  })

  it('returns a timeout signal when timeoutMs is set (no caller signal)', () => {
    const config = makeConfig({ timeoutMs: 10_000 })

    const signal = requestSignal(config)

    expect(signal).toBeInstanceOf(AbortSignal)
    expect(signal?.aborted).toBe(false)
  })

  it('treats a non-positive timeout as no timeout', () => {
    const config = makeConfig({ timeoutMs: 0 })
    const controller = new AbortController()

    expect(requestSignal(config)).toBeUndefined()
    expect(requestSignal(config, controller.signal)).toBe(controller.signal)
  })

  it('combines the caller signal with the timeout via AbortSignal.any', () => {
    const config = makeConfig({ timeoutMs: 10_000 })
    const controller = new AbortController()

    const combined = requestSignal(config, controller.signal)

    expect(combined).toBeInstanceOf(AbortSignal)
    // Not the caller's own signal — a composite.
    expect(combined).not.toBe(controller.signal)
    expect(combined?.aborted).toBe(false)

    // Aborting the caller signal propagates to the composite synchronously.
    controller.abort()
    expect(combined?.aborted).toBe(true)
  })
})
