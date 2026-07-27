import { afterEach, describe, expect, it, vi } from 'vitest'
import { formatTraceparent, newSpanId, newTraceId, newTraceparent } from './trace'

/** The wire grammar the API's `traceparent` parser accepts. */
const TRACEPARENT = /^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/

afterEach(() => {
  vi.restoreAllMocks()
})

function returnZerosThenOnes(): ReturnType<typeof vi.spyOn> {
  let call = 0
  return vi.spyOn(crypto, 'getRandomValues').mockImplementation(array => {
    const bytes = array as Uint8Array
    bytes.fill(call++ === 0 ? 0 : 1)
    return array
  })
}

describe('newTraceId', () => {
  it('is 32 lowercase hex chars', () => {
    expect(newTraceId()).toMatch(/^[0-9a-f]{32}$/)
  })

  it('is not all zeros (the reserved invalid trace id)', () => {
    const getRandomValues = returnZerosThenOnes()

    expect(newTraceId()).toBe('01'.repeat(16))
    expect(getRandomValues).toHaveBeenCalledTimes(2)
  })

  it('mints a distinct id each call', () => {
    const ids = new Set(Array.from({ length: 50 }, () => newTraceId()))
    expect(ids.size).toBe(50)
  })
})

describe('newSpanId', () => {
  it('is 16 lowercase hex chars', () => {
    expect(newSpanId()).toMatch(/^[0-9a-f]{16}$/)
  })

  it('mints a distinct id each call', () => {
    const ids = new Set(Array.from({ length: 50 }, () => newSpanId()))
    expect(ids.size).toBe(50)
  })

  it('regenerates the reserved all-zero span id', () => {
    const getRandomValues = returnZerosThenOnes()

    expect(newSpanId()).toBe('01'.repeat(8))
    expect(getRandomValues).toHaveBeenCalledTimes(2)
  })
})

describe('formatTraceparent', () => {
  it('composes version, trace id, span id, and the sampled flag', () => {
    expect(formatTraceparent('a'.repeat(32), 'b'.repeat(16))).toBe(
      `00-${'a'.repeat(32)}-${'b'.repeat(16)}-01`
    )
  })

  it('mints a span id when one is not supplied', () => {
    const traceId = newTraceId()
    const first = formatTraceparent(traceId)
    const second = formatTraceparent(traceId)

    expect(first).toMatch(TRACEPARENT)
    expect(second).toMatch(TRACEPARENT)
    // Same trace, different spans — the property the retry path depends on.
    expect(first.split('-')[1]).toBe(second.split('-')[1])
    expect(first.split('-')[2]).not.toBe(second.split('-')[2])
  })

  it('always flags the trace as sampled', () => {
    // The API's sampler is ALWAYS_ON, so `-00` would drop the span, not soften it.
    expect(formatTraceparent(newTraceId()).endsWith('-01')).toBe(true)
  })
})

describe('newTraceparent', () => {
  it('produces a well-formed header value', () => {
    expect(newTraceparent()).toMatch(TRACEPARENT)
  })

  it('starts a new trace each call', () => {
    expect(newTraceparent()).not.toBe(newTraceparent())
  })
})
