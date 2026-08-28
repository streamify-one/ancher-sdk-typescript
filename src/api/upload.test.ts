import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AncherClientConfig } from './config'
import { createUploader } from './upload'

function makeUploader(overrides: Partial<AncherClientConfig> = {}) {
  const fetchMock = vi.fn<typeof fetch>()
  fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: 'file-1' })))
  const config: AncherClientConfig = {
    baseUrl: 'https://api.test',
    fetch: fetchMock,
    ...overrides,
  }
  return { upload: createUploader(config), fetchMock }
}

function sentInit(fetchMock: ReturnType<typeof vi.fn<typeof fetch>>): RequestInit {
  const init = fetchMock.mock.calls[0]?.[1]
  if (!init) throw new Error('fetch was not called with an init')
  return init
}

function sentTraceparent(
  fetchMock: ReturnType<typeof vi.fn<typeof fetch>>,
  call: number
): string {
  const headers = fetchMock.mock.calls[call]?.[1]?.headers
  const traceparent = new Headers(headers).get('traceparent')
  if (!traceparent) throw new Error(`fetch call ${call} had no traceparent`)
  return traceparent
}

describe('createUploader', () => {
  it('POSTs a single file under the default field name', async () => {
    const { upload, fetchMock } = makeUploader()

    await upload('/api/v1/image-prompts/', new Blob(['img']))

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.test/api/v1/image-prompts/',
      expect.objectContaining({ method: 'POST' })
    )
    const body = sentInit(fetchMock).body as FormData
    expect(body.getAll('file')).toHaveLength(1)
  })

  it('honors the method override and part filename', async () => {
    const { upload, fetchMock } = makeUploader()

    await upload('/api/v1/notes/n-1/files/f-1/content', new Blob(['# v2']), {
      method: 'PUT',
      filename: 'content.md',
    })

    expect(sentInit(fetchMock).method).toBe('PUT')
    const body = sentInit(fetchMock).body as FormData
    const part = body.get('file')
    expect(part).toBeInstanceOf(File)
    expect((part as File).name).toBe('content.md')
  })

  it('appends extra scalar form fields alongside the file part', async () => {
    const { upload, fetchMock } = makeUploader()

    await upload('/api/v1/files/', new Blob(['x']), { fields: { public: 'true' } })

    const body = sentInit(fetchMock).body as FormData
    expect(body.get('public')).toBe('true')
    expect(body.getAll('file')).toHaveLength(1)
  })

  it('appends every blob of an array under the same field', async () => {
    const { upload, fetchMock } = makeUploader()
    const files = [new File(['a'], 'a.md'), new File(['b'], 'b.md')]

    await upload('/api/v1/files/batch', files, { fieldName: 'files' })

    const body = sentInit(fetchMock).body as FormData
    const parts = body.getAll('files')
    expect(parts).toHaveLength(2)
    expect((parts[0] as File).name).toBe('a.md')
    expect((parts[1] as File).name).toBe('b.md')
  })

  it('replays a 401 in the same trace with a new span id', async () => {
    const refreshSession = vi.fn().mockResolvedValue(true)
    const { upload, fetchMock } = makeUploader({ refreshSession })
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'file-1' })))

    await upload('/api/v1/files/', new Blob(['x']))

    const first = sentTraceparent(fetchMock, 0).split('-')
    const replay = sentTraceparent(fetchMock, 1).split('-')
    expect(refreshSession).toHaveBeenCalledOnce()
    expect(replay[1]).toBe(first[1])
    expect(replay[2]).not.toBe(first[2])
  })

  it('refreshes proactively before the upload when the session is near expiry', async () => {
    const refreshSession = vi.fn().mockResolvedValue(true)
    const { upload, fetchMock } = makeUploader({
      refreshSession,
      getSessionExpiresAt: () => Date.now() + 60_000, // inside the 120s leeway
    })

    await upload('/api/v1/files/', new Blob(['x']))

    expect(refreshSession).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('surfaces a body-phase timeout as TimeoutError while parsing the upload response', async () => {
    vi.useFakeTimers()
    try {
      const { upload, fetchMock } = makeUploader({ timeoutMs: 1_000 })
      fetchMock.mockImplementation(async (_url, init) => {
        // Headers arrive; the body read hangs until the signal aborts and then
        // fails with a generic AbortError (a reason-dropping streaming runtime).
        const response = new Response('{"id":"file-1"}')
        response.text = () =>
          new Promise((_, reject) => {
            init?.signal?.addEventListener('abort', () =>
              reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }))
            )
          })
        return response
      })

      const pending = upload('/api/v1/files/', new Blob(['x']))
      const settled = expect(pending).rejects.toMatchObject({ name: 'TimeoutError' })
      await vi.advanceTimersByTimeAsync(1_000)

      await settled
    } finally {
      vi.useRealTimers()
    }
  })

  it('releases the deadline once the upload response has been parsed (204 included)', async () => {
    vi.useFakeTimers()
    try {
      const { upload, fetchMock } = makeUploader({ timeoutMs: 1_000 })
      fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))

      await upload('/api/v1/files/', new Blob(['x']))

      expect(vi.getTimerCount()).toBe(0)
    } finally {
      vi.useRealTimers()
    }
  })

  describe('React Native file parts ({ uri, name, type })', () => {
    // Node's FormData stringifies a plain object, so record what reaches
    // `append` instead — React Native's FormData is what consumes the part.
    class RecordingFormData {
      /** Exact `append` argument lists — arity matters (a 3rd `undefined` becomes the filename "undefined" on undici). */
      parts: unknown[][] = []
      append(...args: unknown[]): void {
        this.parts.push(args)
      }
    }
    let formData: RecordingFormData | undefined
    beforeEach(() => {
      vi.stubGlobal(
        'FormData',
        class extends RecordingFormData {
          constructor() {
            super()
            formData = this
          }
        }
      )
    })
    afterEach(() => {
      vi.unstubAllGlobals()
      formData = undefined
    })
    const part = { uri: 'file:///tmp/a.pdf', name: 'a.pdf', type: 'application/pdf' }

    it('appends the part object as-is, without a filename argument', async () => {
      const { upload } = makeUploader()

      await upload('/api/v1/files/', part)

      expect(formData?.parts).toEqual([['file', part]])
    })

    it('appends the very same object when nothing needs changing', async () => {
      const { upload } = makeUploader()

      await upload('/api/v1/files/', part)

      expect(formData?.parts[0]?.[1]).toBe(part)
    })

    it('fills an empty type with application/octet-stream (Android rejects a part without one)', async () => {
      const { upload } = makeUploader()

      await upload('/api/v1/files/', { ...part, type: '' })

      expect(formData?.parts).toEqual([
        ['file', { uri: part.uri, name: part.name, type: 'application/octet-stream' }],
      ])
    })

    it('rebuilds a renamed part from its properties, keeping a prototype-backed uri (Expo File)', async () => {
      const { upload } = makeUploader()
      class ExpoLikeFile {
        name = 'a.pdf'
        type = 'application/pdf'
        get uri(): string {
          return 'file:///tmp/a.pdf'
        }
      }

      await upload('/api/v1/files/', new ExpoLikeFile(), { filename: 'renamed.pdf' })

      expect(formData?.parts).toEqual([
        ['file', { uri: 'file:///tmp/a.pdf', name: 'renamed.pdf', type: 'application/pdf' }],
      ])
    })

    it('applies the filename option by renaming the part (RN reads `.name`)', async () => {
      const { upload } = makeUploader()

      await upload('/api/v1/files/', part, { filename: 'renamed.pdf' })

      expect(formData?.parts).toEqual([['file', { ...part, name: 'renamed.pdf' }]])
    })

    it('appends every part of a mixed array under the same field', async () => {
      const { upload } = makeUploader()
      const blob = new Blob(['b'])

      await upload('/api/v1/files/batch', [part, blob], { fieldName: 'files' })

      expect(formData?.parts).toEqual([
        ['files', part],
        ['files', blob],
      ])
    })

    it('still passes the filename argument for Blob parts', async () => {
      const { upload } = makeUploader()
      const blob = new Blob(['b'])

      await upload('/api/v1/files/', blob, { filename: 'b.md' })

      expect(formData?.parts).toEqual([['file', blob, 'b.md']])
    })
  })

  describe('XMLHttpRequest branch (onProgress set)', () => {
    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('rejects an aborted upload with an AbortError on runtimes without DOMException', async () => {
      // React Native installs no global `DOMException`; the rejection must not
      // itself throw a ReferenceError there.
      class FakeXhr {
        upload = { onprogress: null as unknown }
        onload: (() => void) | null = null
        onerror: (() => void) | null = null
        onabort: (() => void) | null = null
        ontimeout: (() => void) | null = null
        status = 0
        statusText = ''
        responseText = ''
        withCredentials = false
        timeout = 0
        open = vi.fn()
        setRequestHeader = vi.fn()
        getAllResponseHeaders = () => ''
        send(): void {
          sent = true
        }
        abort(): void {
          aborted = true
          this.onabort?.()
        }
      }
      let sent = false
      let aborted = false
      vi.stubGlobal('XMLHttpRequest', FakeXhr)
      vi.stubGlobal('DOMException', undefined)
      const { upload } = makeUploader()
      const controller = new AbortController()

      const pending = upload('/api/v1/files/', new Blob(['x']), {
        onProgress: vi.fn(),
        signal: controller.signal,
      })
      // Abort only once the XHR is in flight, so the rejection comes from
      // `xhr.abort()` → `onabort`, not from the pre-aborted early return.
      await vi.waitFor(() => expect(sent).toBe(true))
      controller.abort()

      await expect(pending).rejects.toMatchObject({ name: 'AbortError', message: 'Upload cancelled' })
      expect(aborted).toBe(true)
    })

    it('rejects a timed-out upload with a TimeoutError on runtimes without DOMException', async () => {
      class FakeXhr {
        upload = { onprogress: null as unknown }
        onload: (() => void) | null = null
        onerror: (() => void) | null = null
        onabort: (() => void) | null = null
        ontimeout: (() => void) | null = null
        status = 0
        statusText = ''
        responseText = ''
        withCredentials = false
        timeout = 0
        open = vi.fn()
        setRequestHeader = vi.fn()
        getAllResponseHeaders = () => ''
        send(): void {
          this.ontimeout?.()
        }
      }
      vi.stubGlobal('XMLHttpRequest', FakeXhr)
      vi.stubGlobal('DOMException', undefined)
      const { upload } = makeUploader({ timeoutMs: 5_000 })

      await expect(
        upload('/api/v1/files/', new Blob(['x']), { onProgress: vi.fn() })
      ).rejects.toMatchObject({ name: 'TimeoutError', message: 'Upload timed out' })
    })

    it('honors the method override when uploading with progress', async () => {
      const open = vi.fn()
      class FakeXhr {
        upload = { onprogress: null as unknown }
        onload: (() => void) | null = null
        onerror: (() => void) | null = null
        onabort: (() => void) | null = null
        ontimeout: (() => void) | null = null
        status = 200
        statusText = 'OK'
        responseText = '{"id":"file-1"}'
        withCredentials = false
        timeout = 0
        open = open
        setRequestHeader = vi.fn()
        getAllResponseHeaders = () => ''
        send(): void {
          this.onload?.()
        }
      }
      vi.stubGlobal('XMLHttpRequest', FakeXhr)
      const { upload, fetchMock } = makeUploader()

      const result = await upload<{ id: string }>(
        '/api/v1/notes/n-1/files/f-1/content',
        new Blob(['# v2']),
        { method: 'PUT', onProgress: vi.fn() }
      )

      expect(open).toHaveBeenCalledWith('PUT', 'https://api.test/api/v1/notes/n-1/files/f-1/content')
      expect(result).toEqual({ id: 'file-1' })
      expect(fetchMock).not.toHaveBeenCalled()
    })
    it('reports 100 only for a success — a failed upload never flashes the bar full (VITA-1449)', async () => {
      function fakeXhr(status: number, responseText: string) {
        return class FakeXhr {
          upload = { onprogress: null as unknown as ((event: { lengthComputable: boolean; loaded: number; total: number }) => void) | null }
          onload: (() => void) | null = null
          onerror: (() => void) | null = null
          onabort: (() => void) | null = null
          ontimeout: (() => void) | null = null
          status = status
          statusText = ''
          responseText = responseText
          withCredentials = false
          timeout = 0
          open = vi.fn()
          setRequestHeader = vi.fn()
          getAllResponseHeaders = () => 'content-type: application/json'
          send(): void {
            this.upload.onprogress?.({ lengthComputable: true, loaded: 50, total: 100 })
            this.upload.onprogress?.({ lengthComputable: true, loaded: 100, total: 100 })
            this.onload?.()
          }
        }
      }
      vi.stubGlobal('XMLHttpRequest', fakeXhr(200, '{"id":"file-1"}'))
      const { upload } = makeUploader()
      const onSuccess = vi.fn()
      await upload('/api/v1/files/', new Blob(['x']), { onProgress: onSuccess })
      expect(onSuccess.mock.calls.map(([value]) => value)).toEqual([50, 95, 100])

      vi.stubGlobal('XMLHttpRequest', fakeXhr(413, '{"error":{"code":"API-FIL001","message":"too large"}}'))
      const onFailure = vi.fn()
      await expect(
        upload('/api/v1/files/', new Blob(['x']), { onProgress: onFailure })
      ).rejects.toMatchObject({ status: 413 })
      expect(onFailure.mock.calls.map(([value]) => value)).toEqual([50, 95])
    })
    it('resolves undefined for a 204 answered over XHR (the Response must carry a null body)', async () => {
      class FakeXhr {
        upload = { onprogress: null as unknown }
        onload: (() => void) | null = null
        onerror: (() => void) | null = null
        onabort: (() => void) | null = null
        ontimeout: (() => void) | null = null
        status = 204
        statusText = 'No Content'
        responseText = ''
        withCredentials = false
        timeout = 0
        open = vi.fn()
        setRequestHeader = vi.fn()
        getAllResponseHeaders = () => ''
        send(): void {
          this.onload?.()
        }
      }
      vi.stubGlobal('XMLHttpRequest', FakeXhr)
      const { upload } = makeUploader()
      const onProgress = vi.fn()
      await expect(upload('/api/v1/files/', new Blob(['x']), { onProgress })).resolves.toBeUndefined()
      expect(onProgress).toHaveBeenLastCalledWith(100)
    })
    it('rejects a load that carries no HTTP status instead of hanging (VITA-1449)', async () => {
      class FakeXhr {
        upload = { onprogress: null as unknown }
        onload: (() => void) | null = null
        onerror: (() => void) | null = null
        onabort: (() => void) | null = null
        ontimeout: (() => void) | null = null
        status = 0
        statusText = ''
        responseText = ''
        withCredentials = false
        timeout = 0
        open = vi.fn()
        setRequestHeader = vi.fn()
        getAllResponseHeaders = () => ''
        send(): void {
          this.onload?.()
        }
      }
      vi.stubGlobal('XMLHttpRequest', FakeXhr)
      const { upload } = makeUploader()
      const onProgress = vi.fn()
      const failure = await upload('/api/v1/files/', new Blob(['x']), { onProgress }).catch(
        (error: unknown) => error
      )
      expect(failure).toBeInstanceOf(TypeError)
      expect(onProgress).not.toHaveBeenCalledWith(100)
    })
    it('does not report 100 when the response cannot be constructed, and rejects instead of hanging', async () => {
      class FakeXhr {
        upload = { onprogress: null as unknown }
        onload: (() => void) | null = null
        onerror: (() => void) | null = null
        onabort: (() => void) | null = null
        ontimeout: (() => void) | null = null
        status = 200
        statusText = 'OK'
        responseText = '{"id":"file-1"}'
        withCredentials = false
        timeout = 0
        open = vi.fn()
        setRequestHeader = vi.fn()
        getAllResponseHeaders = (): string => {
          throw new Error('malformed header block')
        }
        send(): void {
          this.onload?.()
        }
      }
      vi.stubGlobal('XMLHttpRequest', FakeXhr)
      const { upload } = makeUploader()
      const onProgress = vi.fn()
      await expect(upload('/api/v1/files/', new Blob(['x']), { onProgress })).rejects.toThrow(
        'malformed header block'
      )
      expect(onProgress).not.toHaveBeenCalledWith(100)
    })
    it('never reports 100 for a 2xx whose body fails validation — malformed or empty JSON (VITA-1449)', async () => {
      function fakeXhr(responseText: string) {
        return class FakeXhr {
          upload = { onprogress: null as unknown as ((event: { lengthComputable: boolean; loaded: number; total: number }) => void) | null }
          onload: (() => void) | null = null
          onerror: (() => void) | null = null
          onabort: (() => void) | null = null
          ontimeout: (() => void) | null = null
          status = 200
          statusText = 'OK'
          responseText = responseText
          withCredentials = false
          timeout = 0
          open = vi.fn()
          setRequestHeader = vi.fn()
          getAllResponseHeaders = () => 'content-type: application/json'
          send(): void {
            this.upload.onprogress?.({ lengthComputable: true, loaded: 100, total: 100 })
            this.onload?.()
          }
        }
      }
      for (const body of ['{"id":"file-', '']) {
        vi.stubGlobal('XMLHttpRequest', fakeXhr(body))
        const { upload } = makeUploader()
        const onProgress = vi.fn()
        await expect(upload('/api/v1/files/', new Blob(['x']), { onProgress })).rejects.toMatchObject({
          name: 'AncherApiError',
          status: 200,
        })
        expect(onProgress.mock.calls.map(([value]) => value)).toEqual([95])
      }
    })
    it('rejects a transport failure with a TypeError, like the fetch path (VITA-1449)', async () => {
      class FakeXhr {
        upload = { onprogress: null as unknown }
        onload: (() => void) | null = null
        onerror: (() => void) | null = null
        onabort: (() => void) | null = null
        ontimeout: (() => void) | null = null
        status = 0
        statusText = ''
        responseText = ''
        withCredentials = false
        timeout = 0
        open = vi.fn()
        setRequestHeader = vi.fn()
        getAllResponseHeaders = () => ''
        send(): void {
          this.onerror?.()
        }
      }
      vi.stubGlobal('XMLHttpRequest', FakeXhr)
      const { upload } = makeUploader()
      const failure = await upload('/api/v1/files/', new Blob(['x']), { onProgress: vi.fn() }).catch(
        (error: unknown) => error
      )
      expect(failure).toBeInstanceOf(TypeError)
      expect(failure).toMatchObject({ message: 'Upload failed: network error' })
    })
  })
})

describe('empty response bodies (VITA-1449)', () => {
  it('resolves undefined for a 204', async () => {
    const { upload, fetchMock } = makeUploader()
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))
    await expect(upload('/api/v1/files/', new Blob(['x']))).resolves.toBeUndefined()
  })
  it('throws an AncherApiError, not a bare SyntaxError, for a truncated success body', async () => {
    const { upload, fetchMock } = makeUploader()
    fetchMock.mockResolvedValueOnce(
      new Response('{"id":"file-', {
        status: 200,
        headers: { 'content-type': 'application/json', 'x-trace-id': 'trace-cut' },
      })
    )
    await expect(upload('/api/v1/files/', new Blob(['x']))).rejects.toMatchObject({
      name: 'AncherApiError',
      status: 200,
      traceId: 'trace-cut',
    })
  })
  it('throws for an empty success body instead of resolving undefined typed as the entity', async () => {
    const { upload, fetchMock } = makeUploader()
    fetchMock.mockResolvedValueOnce(
      new Response('', { status: 200, headers: { 'content-type': 'application/json' } })
    )
    await expect(upload('/api/v1/files/', new Blob(['x']))).rejects.toMatchObject({
      name: 'AncherApiError',
      status: 200,
    })
  })
})
