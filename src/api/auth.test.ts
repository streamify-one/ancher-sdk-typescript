import { describe, expect, it, vi } from 'vitest'
import type { AncherClientConfig } from './config'
import { AncherApiError } from './errors'
import {
  applyAuthHeader,
  buildContextHeaders,
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
