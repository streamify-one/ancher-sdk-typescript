import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AncherClientConfig } from './config'
import { AncherApiError } from './errors'
import { createFetcher } from './transport'

/**
 * Build a fetcher with an injected mock `fetch` so nothing ever touches the
 * network. `encodeSearchParams` never calls `fetch`, but wiring a stub keeps
 * the config self-contained and guards against accidental global-fetch use.
 * The `Fetcher` interface types `encodeSearchParams` as optional, but
 * `createFetcher` always provides it — assert + return it narrowed so tests can
 * invoke it directly.
 */
function makeFetcher(overrides: Partial<AncherClientConfig> = {}) {
  const fetchMock = vi.fn<typeof fetch>()
  const config: AncherClientConfig = { fetch: fetchMock, ...overrides }
  const fetcher = createFetcher(config)
  if (!fetcher.encodeSearchParams) {
    throw new Error('createFetcher should always provide encodeSearchParams')
  }
  return { fetcher, encodeSearchParams: fetcher.encodeSearchParams, fetchMock }
}

describe('createFetcher', () => {
  it('throws when no fetch implementation is available', () => {
    const originalFetch = globalThis.fetch
    // biome-ignore lint/performance/noDelete: restoring the global after the test
    ;(globalThis as { fetch?: typeof fetch }).fetch = undefined
    try {
      expect(() => createFetcher({})).toThrow(/No `fetch` implementation available/)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('exposes encodeSearchParams as a property of the returned fetcher', () => {
    const { fetcher } = makeFetcher()
    expect(typeof fetcher.encodeSearchParams).toBe('function')
  })

  it('does not call fetch when only encoding params', () => {
    const { encodeSearchParams, fetchMock } = makeFetcher()
    encodeSearchParams({ q: 'hello' })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

/** The `traceparent` sent on the nth `fetch` call, split into its four fields. */
function traceparentOf(fetchMock: ReturnType<typeof vi.fn<typeof fetch>>, call: number) {
  const headers = fetchMock.mock.calls[call]?.[1]?.headers as Record<string, string> | undefined
  return (headers?.traceparent ?? '').split('-')
}

function jsonResponse(status: number): Response {
  return new Response(JSON.stringify({}), { status })
}

/** A minimal generated-client `FetchInput`. */
const NOTES_INPUT = {
  method: 'get' as const,
  path: '/api/v1/notes/',
  url: new URL('https://api.test/api/v1/notes/'),
}

describe('traceparent propagation', () => {
  it('sends a well-formed traceparent on every request', async () => {
    const { fetcher, fetchMock } = makeFetcher()
    fetchMock.mockResolvedValue(jsonResponse(200))

    await fetcher.fetch(NOTES_INPUT)

    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Record<string, string>
    expect(headers.traceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/)
  })

  it('starts a distinct trace for each logical request', async () => {
    const { fetcher, fetchMock } = makeFetcher()
    fetchMock.mockResolvedValue(jsonResponse(200))

    await fetcher.fetch(NOTES_INPUT)
    await fetcher.fetch(NOTES_INPUT)

    expect(traceparentOf(fetchMock, 0)[1]).not.toBe(traceparentOf(fetchMock, 1)[1])
  })

  it('replays a 401 into the SAME trace with a NEW span id', async () => {
    // The retry is a sibling span of the original attempt, not a separate
    // trace — otherwise a refreshed-and-succeeded request is unfindable from
    // the trace id the first attempt reported.
    const refreshSession = vi.fn().mockResolvedValue(true)
    const { fetcher, fetchMock } = makeFetcher({ refreshSession })
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401))
      .mockResolvedValueOnce(jsonResponse(200))

    await fetcher.fetch(NOTES_INPUT)

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(refreshSession).toHaveBeenCalledOnce()

    const [, firstTrace, firstSpan, firstFlags] = traceparentOf(fetchMock, 0)
    const [, replayTrace, replaySpan, replayFlags] = traceparentOf(fetchMock, 1)

    expect(replayTrace).toBe(firstTrace)
    expect(replaySpan).not.toBe(firstSpan)
    expect(replaySpan).toMatch(/^[0-9a-f]{16}$/)
    expect(firstFlags).toBe('01')
    expect(replayFlags).toBe('01')
  })

  it('refreshes proactively before the request when the session is near expiry', async () => {
    const refreshSession = vi.fn().mockResolvedValue(true)
    const { fetcher, fetchMock } = makeFetcher({
      refreshSession,
      getSessionExpiresAt: () => Date.now() + 60_000, // inside the 120s leeway
    })
    fetchMock.mockResolvedValue(jsonResponse(200))

    await fetcher.fetch(NOTES_INPUT)

    expect(refreshSession).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledTimes(1) // single request, no 401 round trip
  })

  it('lets an explicit per-request header override the generated traceparent', async () => {
    const { fetcher, fetchMock } = makeFetcher()
    fetchMock.mockResolvedValue(jsonResponse(200))

    await fetcher.fetch({
      ...NOTES_INPUT,
      overrides: { headers: { traceparent: `00-${'d'.repeat(32)}-${'e'.repeat(16)}-01` } },
    })

    expect(traceparentOf(fetchMock, 0)[1]).toBe('d'.repeat(32))
  })
})

describe('encodeSearchParams', () => {
  it('returns an empty URLSearchParams for undefined input', () => {
    const { encodeSearchParams } = makeFetcher()
    const search = encodeSearchParams(undefined)
    expect(search).toBeInstanceOf(URLSearchParams)
    expect(search.toString()).toBe('')
  })

  it('returns an empty URLSearchParams for an empty object', () => {
    const { encodeSearchParams } = makeFetcher()
    expect(encodeSearchParams({}).toString()).toBe('')
  })

  it('appends string scalars as-is', () => {
    const { encodeSearchParams } = makeFetcher()
    const search = encodeSearchParams({ q: 'hello world' })
    expect(search.getAll('q')).toEqual(['hello world'])
  })

  it('stringifies number scalars', () => {
    const { encodeSearchParams } = makeFetcher()
    const search = encodeSearchParams({ limit: 25, offset: 0 })
    expect(search.getAll('limit')).toEqual(['25'])
    expect(search.getAll('offset')).toEqual(['0'])
  })

  it('stringifies boolean scalars', () => {
    const { encodeSearchParams } = makeFetcher()
    const search = encodeSearchParams({ archived: true, pinned: false })
    expect(search.getAll('archived')).toEqual(['true'])
    expect(search.getAll('pinned')).toEqual(['false'])
  })

  it('skips null and undefined values', () => {
    const { encodeSearchParams } = makeFetcher()
    const search = encodeSearchParams({
      a: null,
      b: undefined,
      c: 'kept',
    })
    expect(search.has('a')).toBe(false)
    expect(search.has('b')).toBe(false)
    expect(search.getAll('c')).toEqual(['kept'])
    expect(search.toString()).toBe('c=kept')
  })

  it('encodes a string array as repeated primitive params', () => {
    const { encodeSearchParams } = makeFetcher()
    const search = encodeSearchParams({
      order_by: ['created_at', '-updated_at'],
    })
    expect(search.getAll('order_by')).toEqual(['created_at', '-updated_at'])
  })

  it('skips null/undefined items within an array', () => {
    const { encodeSearchParams } = makeFetcher()
    const search = encodeSearchParams({
      order_by: ['created_at', null, undefined, '-updated_at'],
    })
    expect(search.getAll('order_by')).toEqual(['created_at', '-updated_at'])
  })

  it('JSON-encodes each object in an array of objects (criteria)', () => {
    const { encodeSearchParams } = makeFetcher()
    const criteria = [{ status: { eq: 'active' } }, { archived: { eq: false } }]
    const search = encodeSearchParams({ criteria })
    expect(search.getAll('criteria')).toEqual([
      JSON.stringify({ status: { eq: 'active' } }),
      JSON.stringify({ archived: { eq: false } }),
    ])
  })

  it('JSON-encodes a plain object value as a single param', () => {
    const { encodeSearchParams } = makeFetcher()
    const search = encodeSearchParams({ status: { eq: 'active' } })
    expect(search.getAll('status')).toEqual([JSON.stringify({ eq: 'active' })])
  })

  it('handles a mixed param set the way the list endpoints expect', () => {
    const { encodeSearchParams } = makeFetcher()
    const search = encodeSearchParams({
      q: 'notes',
      limit: 50,
      archived: false,
      cursor: null,
      order_by: ['-created_at', 'title'],
      criteria: [{ status: { eq: 'active' } }],
      status: { eq: 'active' },
    })

    expect(search.getAll('q')).toEqual(['notes'])
    expect(search.getAll('limit')).toEqual(['50'])
    expect(search.getAll('archived')).toEqual(['false'])
    expect(search.has('cursor')).toBe(false)
    expect(search.getAll('order_by')).toEqual(['-created_at', 'title'])
    expect(search.getAll('criteria')).toEqual([JSON.stringify({ status: { eq: 'active' } })])
    expect(search.getAll('status')).toEqual([JSON.stringify({ eq: 'active' })])
  })

  it('round-trips through toString() with URL encoding applied', () => {
    const { encodeSearchParams } = makeFetcher()
    const search = encodeSearchParams({
      status: { eq: 'active' },
    })
    const roundTripped = new URLSearchParams(search.toString())
    expect(roundTripped.get('status')).toBe(JSON.stringify({ eq: 'active' }))
  })
})

/**
 * `parseResponseData` is optional on the `Fetcher` interface but always
 * supplied by `createFetcher` — assert + narrow so tests can invoke it.
 */
function makeParser() {
  const { fetcher } = makeFetcher()
  if (!fetcher.parseResponseData) {
    throw new Error('createFetcher should always provide parseResponseData')
  }
  return fetcher.parseResponseData
}

function response(body: BodyInit | null, contentType: string, status = 200): Response {
  return new Response(body, { status, headers: { 'content-type': contentType } })
}

describe('parseResponseData', () => {
  it('parses a JSON body', async () => {
    const parse = makeParser()
    await expect(parse(response('{"has_more":false}', 'application/json'))).resolves.toEqual({
      has_more: false,
    })
  })

  it('honours a JSON content type carrying a charset', async () => {
    const parse = makeParser()
    await expect(
      parse(response('{"ok":true}', 'application/json; charset=utf-8'))
    ).resolves.toEqual({ ok: true })
  })

  /**
   * The regression: the generated `defaultParseResponseData` swallows this into
   * `undefined` while typing the call as returning its schema, so a body cut
   * short mid-flight surfaced wherever the caller first read a field — for an
   * infinite query, `has_more` during a React render (VITA-1216).
   */
  it('throws for a truncated JSON body on a success response', async () => {
    const parse = makeParser()
    await expect(parse(response('{"items":[{"id"', 'application/json'))).rejects.toThrow(
      AncherApiError
    )
  })

  it('carries the response trace id on the malformed-body error', async () => {
    const parse = makeParser()
    const malformed = new Response('{"items"', {
      status: 200,
      headers: { 'content-type': 'application/json', 'x-trace-id': 'abc123' },
    })
    await expect(parse(malformed)).rejects.toMatchObject({ status: 200, traceId: 'abc123' })
  })

  it('resolves undefined for a bodyless response', async () => {
    const parse = makeParser()
    await expect(parse(response(null, 'application/json', 204))).resolves.toBeUndefined()
    await expect(parse(response('', 'application/json'))).resolves.toBeUndefined()
    await expect(parse(response('   ', 'application/json'))).resolves.toBeUndefined()
  })

  it('keeps an unparseable error body as data rather than throwing', async () => {
    // `withResponse: true` sets `throwOnStatusError: false`, so the caller reads
    // `.status`/`.data` instead of catching — a throw here would break that.
    const parse = makeParser()
    await expect(parse(response('<html>502</html>', 'application/json', 502))).resolves.toBeUndefined()
  })

  it('returns text bodies verbatim', async () => {
    const parse = makeParser()
    await expect(parse(response('plain', 'text/plain'))).resolves.toBe('plain')
    await expect(parse(response('<html>', 'text/html'))).resolves.toBe('<html>')
  })

  it('returns binary bodies as an ArrayBuffer', async () => {
    const parse = makeParser()
    const parsed = await parse(response('abc', 'application/octet-stream'))
    expect(parsed).toBeInstanceOf(ArrayBuffer)
  })

  it('resolves undefined for an unrecognized or absent content type', async () => {
    const parse = makeParser()
    await expect(parse(response('abc', 'image/png'))).resolves.toBeUndefined()

    // A proxy or CDN stripping the header is one of the ways a list endpoint
    // produced `undefined` — the list-surface guard in repositories/base.ts is
    // what catches this one, since there's no body type to parse against.
    const headerless = new Response('abc', { status: 200 })
    headerless.headers.delete('content-type')
    await expect(parse(headerless)).resolves.toBeUndefined()
  })
})

describe('request deadline', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('rejects a timed-out request with a TimeoutError even when fetch reports a bare AbortError', async () => {
    // React Native's fetch rejects every abort as `AbortError('Aborted')`; the
    // transport must still tell the host it was the deadline.
    vi.useFakeTimers()
    const { fetcher, fetchMock } = makeFetcher({ timeoutMs: 1_000 })
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise((_, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }))
          )
        })
    )
    const pending = fetcher.fetch(NOTES_INPUT)
    const settled = expect(pending).rejects.toMatchObject({ name: 'TimeoutError' })

    // The deadline is armed only once the (async) auth headers are built, so
    // let microtasks run between timer ticks.
    await vi.advanceTimersByTimeAsync(1_000)

    await settled
  })

  it('surfaces a body-phase timeout as TimeoutError through parseResponseData', async () => {
    vi.useFakeTimers()
    const { fetcher, fetchMock } = makeFetcher({ timeoutMs: 1_000 })
    fetchMock.mockImplementation(async (_url, init) => {
      // Headers arrive; the body read then hangs until the signal aborts and
      // fails with a generic AbortError (a reason-dropping streaming runtime).
      const response = new Response('{"stalled":true}', {
        headers: { 'content-type': 'application/json' },
      })
      response.text = () =>
        new Promise((_, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }))
          )
        })
      return response
    })

    const response = await fetcher.fetch(NOTES_INPUT)
    const settled = expect(fetcher.parseResponseData?.(response)).rejects.toMatchObject({
      name: 'TimeoutError',
    })
    await vi.advanceTimersByTimeAsync(1_000)

    await settled
  })

  it('releases the deadline once the response body has been parsed', async () => {
    vi.useFakeTimers()
    const { fetcher, fetchMock } = makeFetcher({ timeoutMs: 1_000 })
    fetchMock.mockResolvedValue(
      new Response('{"ok":true}', { headers: { 'content-type': 'application/json' } })
    )

    const response = await fetcher.fetch(NOTES_INPUT)
    expect(vi.getTimerCount()).toBe(1)
    await fetcher.parseResponseData?.(response)

    expect(vi.getTimerCount()).toBe(0)
  })

  it('hands the caller signal straight to fetch when no timeout is configured', async () => {
    const { fetcher, fetchMock } = makeFetcher()
    fetchMock.mockResolvedValue(new Response('[]'))
    const controller = new AbortController()

    await fetcher.fetch({ ...NOTES_INPUT, overrides: { signal: controller.signal } })

    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBe(controller.signal)
  })
})
