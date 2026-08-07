import { afterEach, describe, expect, it, vi } from 'vitest'
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

  describe('XMLHttpRequest branch (onProgress set)', () => {
    afterEach(() => {
      vi.unstubAllGlobals()
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
  })
})
