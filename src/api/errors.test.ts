import { describe, expect, it } from 'vitest'
import {
  ACTIVATION_REQUIRED_ERROR_CODE,
  AncherApiError,
  buildApiError,
  hasErrorCode,
  INSUFFICIENT_CREDITS_ERROR_CODE,
  isActivationRequiredError,
  isAncherApiError,
  isApiError,
  isInsufficientCreditsError,
} from './errors'

const jsonResponse = (body: unknown, init?: ResponseInit): Response =>
  new Response(JSON.stringify(body), {
    status: init?.status ?? 400,
    statusText: init?.statusText,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  })

describe('buildApiError trace id', () => {
  const TRACE_ID = '4bf92f3577b34da6a3ce929d0e0e4736'
  const HEADER_TRACE_ID = '0af7651916cd43dd8448eb211c80319c'

  it('reads trace_id from the error envelope', async () => {
    const response = jsonResponse(
      { error: { code: 'API-INT001', message: 'Boom', trace_id: TRACE_ID } },
      { status: 500 }
    )

    expect((await buildApiError(response)).traceId).toBe(TRACE_ID)
  })

  it('falls back to the X-Trace-Id header when the body is not our envelope', async () => {
    // A gateway 502 returns HTML, not JSON — the header is the only source left.
    const response = new Response('<html>502 Bad Gateway</html>', {
      status: 502,
      headers: { 'content-type': 'text/html', 'x-trace-id': HEADER_TRACE_ID },
    })

    const error = await buildApiError(response)

    expect(error.traceId).toBe(HEADER_TRACE_ID)
    expect(error.code).toBeUndefined()
  })

  it('falls back to the header when the JSON body carries no trace_id', async () => {
    const response = jsonResponse(
      { error: { code: 'API-INT001', message: 'Boom' } },
      { status: 500, headers: { 'x-trace-id': HEADER_TRACE_ID } }
    )

    expect((await buildApiError(response)).traceId).toBe(HEADER_TRACE_ID)
  })

  it('prefers the body trace_id over the header', async () => {
    const response = jsonResponse(
      { error: { code: 'API-INT001', message: 'Boom', trace_id: TRACE_ID } },
      { status: 500, headers: { 'x-trace-id': HEADER_TRACE_ID } }
    )

    expect((await buildApiError(response)).traceId).toBe(TRACE_ID)
  })

  it('is undefined when neither the body nor the headers carry one', async () => {
    const response = jsonResponse({ error: { code: 'API-INT001', message: 'Boom' } }, { status: 500 })

    expect((await buildApiError(response)).traceId).toBeUndefined()
  })

  it('normalizes an empty X-Trace-Id header to undefined', async () => {
    const response = jsonResponse({}, { status: 500, headers: { 'x-trace-id': '' } })

    expect((await buildApiError(response)).traceId).toBeUndefined()
  })

  it('ignores a non-string trace_id', async () => {
    const response = jsonResponse({ error: { code: 'X', message: 'm', trace_id: 42 } }, { status: 500 })

    expect((await buildApiError(response)).traceId).toBeUndefined()
  })
})

describe('buildApiError', () => {
  it('parses the { error: { code, message, details? } } envelope', async () => {
    const response = jsonResponse(
      { error: { code: 'API-BIS002', message: 'Not enough credits left' } },
      { status: 402 }
    )

    const error = await buildApiError(response)

    expect(error).toBeInstanceOf(AncherApiError)
    expect(error.status).toBe(402)
    expect(error.code).toBe('API-BIS002')
    expect(error.message).toBe('Not enough credits left')
    // No FastAPI `detail` array present, so details stays undefined.
    expect(error.details).toBeUndefined()
    // The raw parsed body is preserved for callers that need more.
    expect(error.body).toEqual({
      error: { code: 'API-BIS002', message: 'Not enough credits left' },
    })
  })

  it('exposes the catalog definition for a known code via .definition', async () => {
    const response = jsonResponse(
      { error: { code: 'API-BIS002', message: 'Not enough credits left' } },
      { status: 402 }
    )

    const error = await buildApiError(response)

    expect(error.definition).toEqual({
      name: 'BILLING_INSUFFICIENT_CREDITS',
      message: 'Insufficient credits',
      status: 402,
    })
    expect(error.parsedCode?.module).toBe('BI')
    expect(error.parsedCode?.layer).toBe('S')
    expect(error.parsedCode?.sequence).toBe('002')
  })

  it('parses the FastAPI { detail: [{ loc, msg, type }] } validation shape', async () => {
    const detail = [
      { loc: ['body', 'name'], msg: 'field required', type: 'value_error.missing' },
      { loc: ['body', 'email'], msg: 'invalid email', type: 'value_error.email' },
    ]
    const response = jsonResponse({ detail }, { status: 422 })

    const error = await buildApiError(response)

    expect(error.status).toBe(422)
    expect(error.details).toEqual(detail)
    // No `error.code` in the body → code stays undefined.
    expect(error.code).toBeUndefined()
  })

  it('uses a string `detail` as the message', async () => {
    const response = jsonResponse({ detail: 'Not authenticated' }, { status: 401 })

    const error = await buildApiError(response)

    expect(error.message).toBe('Not authenticated')
    // A string detail is not an array, so details stays undefined.
    expect(error.details).toBeUndefined()
  })

  it('uses a top-level `message` field when present', async () => {
    const response = jsonResponse({ message: 'Something broke' }, { status: 500 })

    const error = await buildApiError(response)

    expect(error.message).toBe('Something broke')
  })

  it('falls back to the catalog message when the body carries only a code', async () => {
    const response = jsonResponse({ error: { code: 'API-BIS002' } }, { status: 402 })

    const error = await buildApiError(response)

    expect(error.code).toBe('API-BIS002')
    // No message on the wire → resolved from the generated catalog.
    expect(error.message).toBe('Insufficient credits')
  })

  it('falls back to the provided fallbackMessage when the body is not JSON', async () => {
    const response = new Response('<html>gateway error</html>', {
      status: 502,
      statusText: 'Bad Gateway',
      headers: { 'content-type': 'text/html' },
    })

    const error = await buildApiError(response, 'Upstream unavailable')

    expect(error.status).toBe(502)
    expect(error.message).toBe('Upstream unavailable')
    expect(error.code).toBeUndefined()
    expect(error.details).toBeUndefined()
    expect(error.body).toBeUndefined()
  })

  it('falls back to the status text when the body is not JSON and no fallback is given', async () => {
    const response = new Response('not json', {
      status: 503,
      statusText: 'Service Unavailable',
    })

    const error = await buildApiError(response)

    expect(error.message).toBe('Service Unavailable')
    expect(error.status).toBe(503)
  })

  it('falls back to a synthesized status message when statusText is empty', async () => {
    const response = new Response('not json', { status: 418, statusText: '' })

    const error = await buildApiError(response)

    expect(error.message).toBe('Request failed with status 418')
  })

  it('prefers the fallbackMessage over statusText even for a non-JSON body', async () => {
    const response = new Response('boom', { status: 500, statusText: 'Internal Server Error' })

    const error = await buildApiError(response, 'Custom fallback')

    expect(error.message).toBe('Custom fallback')
  })

  it('prefers the envelope message over the fallbackMessage when the body is JSON', async () => {
    const response = jsonResponse(
      { error: { code: 'API-BIS002', message: 'Wire message wins' } },
      { status: 402 }
    )

    const error = await buildApiError(response, 'ignored fallback')

    expect(error.message).toBe('Wire message wins')
  })

  it('never throws and returns an AncherApiError for an empty body', async () => {
    const response = new Response(null, { status: 500 })

    const error = await buildApiError(response)

    expect(isAncherApiError(error)).toBe(true)
    expect(error.status).toBe(500)
  })

  it('does not clobber the response so the caller can still read the original', async () => {
    // buildApiError reads a clone(), leaving the passed response body intact.
    const response = jsonResponse({ error: { code: 'API-BIS002', message: 'x' } }, { status: 402 })

    await buildApiError(response)

    await expect(response.json()).resolves.toEqual({
      error: { code: 'API-BIS002', message: 'x' },
    })
  })
})

describe('isInsufficientCreditsError', () => {
  it('is true for an object carrying code API-BIS002 regardless of status', () => {
    expect(isInsufficientCreditsError({ code: INSUFFICIENT_CREDITS_ERROR_CODE, status: 200 })).toBe(
      true
    )
    expect(
      isInsufficientCreditsError(new AncherApiError({ message: 'x', status: 402, code: 'API-BIS002' }))
    ).toBe(true)
  })

  it('is false when the code differs even if the status is 402', () => {
    expect(isInsufficientCreditsError({ code: 'API-OTHER1', status: 402 })).toBe(false)
  })

  it('is false when there is no code, even with a 402 status', () => {
    expect(isInsufficientCreditsError({ status: 402, message: 'nope' })).toBe(false)
  })

  it('is false for non-object inputs', () => {
    expect(isInsufficientCreditsError(null)).toBe(false)
    expect(isInsufficientCreditsError(undefined)).toBe(false)
    expect(isInsufficientCreditsError('API-BIS002')).toBe(false)
  })
})

describe('isActivationRequiredError', () => {
  it('is true only for code API-USR010, keyed on code not status', () => {
    expect(isActivationRequiredError({ code: ACTIVATION_REQUIRED_ERROR_CODE, status: 200 })).toBe(
      true
    )
    expect(
      isActivationRequiredError(new AncherApiError({ message: 'x', status: 403, code: 'API-USR010' }))
    ).toBe(true)
  })

  it('is false for a different code even with status 403', () => {
    expect(isActivationRequiredError({ code: 'API-USR011', status: 403 })).toBe(false)
  })

  it('is false for the insufficient-credits code', () => {
    expect(isActivationRequiredError({ code: 'API-BIS002', status: 402 })).toBe(false)
  })
})

describe('hasErrorCode / isApiError / isAncherApiError', () => {
  it('hasErrorCode matches on the exact code', () => {
    expect(hasErrorCode({ code: 'API-USR010' }, 'API-USR010')).toBe(true)
    expect(hasErrorCode({ code: 'API-USR010' }, 'API-BIS002')).toBe(false)
    expect(hasErrorCode({}, 'API-USR010')).toBe(false)
    expect(hasErrorCode(null, 'API-USR010')).toBe(false)
  })

  it('isApiError matches any object with message + status', () => {
    expect(isApiError({ message: 'x', status: 400 })).toBe(true)
    expect(isApiError(new AncherApiError({ message: 'x', status: 400 }))).toBe(true)
    expect(isApiError({ message: 'x' })).toBe(false)
    expect(isApiError({ status: 400 })).toBe(false)
    expect(isApiError(null)).toBe(false)
  })

  it('isAncherApiError is a precise instanceof check', () => {
    expect(isAncherApiError(new AncherApiError({ message: 'x', status: 400 }))).toBe(true)
    // A structural match is not an instance.
    expect(isAncherApiError({ message: 'x', status: 400 })).toBe(false)
    expect(isAncherApiError(new Error('x'))).toBe(false)
  })
})
