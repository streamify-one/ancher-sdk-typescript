import { describe, expect, it, vi } from 'vitest'
import type { AncherClientConfig } from './config'
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
