import { describe, expect, it, vi } from 'vitest'
import type { AncherClient } from '../api/client'
import { createFileRepository } from './file'

function makeRepository() {
  const post = vi.fn()
  const fetchMock = vi.fn()
  const upload = vi.fn()
  const client = {
    api: { post },
    config: { fetch: fetchMock },
    upload,
  } as unknown as AncherClient

  return { File: createFileRepository(client), fetchMock, post, upload }
}

describe('FileRepository', () => {
  it('mints a file content presigned URL', async () => {
    const { File, post } = makeRepository()
    post.mockResolvedValueOnce({ download_url: 'https://cdn.test/file' })

    const url = await File.presignedUrl('file-1', { revision: 3, w: 720 })

    expect(post).toHaveBeenCalledWith('/api/v1/files/{file_id}/content/presigned-urls', {
      path: { file_id: 'file-1' },
      query: { revision: 3, w: 720 },
    })
    expect(url).toBe('https://cdn.test/file')
  })

  it('mints a presigned URL and fetches it', async () => {
    const { File, fetchMock, post } = makeRepository()
    const response = new Response('payload')
    post.mockResolvedValueOnce({ download_url: 'https://cdn.test/file' })
    fetchMock.mockResolvedValueOnce(response)

    const result = await File.download('file-1')

    expect(fetchMock).toHaveBeenCalledWith('https://cdn.test/file', { signal: undefined })
    expect(result).toBe(response)
  })

  describe('uploadDirect', () => {
    it('posts the file through the multipart uploader with progress and abort options', async () => {
      const { File, upload } = makeRepository()
      const uploaded = { id: 'file-1' }
      const blob = new Blob(['bytes'])
      const onProgress = vi.fn()
      const signal = new AbortController().signal
      upload.mockResolvedValueOnce(uploaded)

      const result = await File.uploadDirect(blob, { filename: 'a.md', onProgress, signal })

      expect(upload).toHaveBeenCalledWith('/api/v1/files/', blob, {
        filename: 'a.md',
        onProgress,
        signal,
      })
      expect(result).toBe(uploaded)
    })

    it('passes a React Native file part straight through to the uploader', async () => {
      const { File, upload } = makeRepository()
      const part = { uri: 'file:///tmp/a.pdf', name: 'a.pdf', type: 'application/pdf' }
      upload.mockResolvedValueOnce({ id: 'file-1' })

      await File.uploadDirect(part)

      expect(upload).toHaveBeenCalledWith('/api/v1/files/', part, {})
    })

    it('maps the public flag to a scalar form field', async () => {
      const { File, upload } = makeRepository()
      const blob = new Blob(['bytes'])
      upload.mockResolvedValueOnce({ id: 'file-1' })

      await File.uploadDirect(blob, { public: true })

      expect(upload).toHaveBeenCalledWith('/api/v1/files/', blob, {
        fields: { public: 'true' },
      })
    })
  })

  it('threads the abort signal through the presigned upload flow', async () => {
    const { File, fetchMock, post } = makeRepository()
    const signal = new AbortController().signal
    post.mockResolvedValueOnce({ upload_url: 'https://s3.test/put', s3_key: 'key-1' })
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }))
    post.mockResolvedValueOnce({ id: 'file-1' })

    await File.upload(new globalThis.File(['a'], 'a.md'), { signal })

    expect(post).toHaveBeenNthCalledWith(1, '/api/v1/files/presigned-urls', {
      body: { filename: 'a.md', mimetype: 'application/octet-stream' },
      overrides: { signal },
    })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://s3.test/put',
      expect.objectContaining({ signal })
    )
    expect(post).toHaveBeenNthCalledWith(2, '/api/v1/files/completions', {
      body: { s3_key: 'key-1', filename: 'a.md' },
      overrides: { signal },
    })
  })

  describe('presigned S3 PUT headers', () => {
    // The presign is signed over a header set the URL names in
    // `X-Amz-SignedHeaders`. Sending fewer headers than were signed is a
    // `403 SignatureDoesNotMatch` — which is exactly what shipped: the PUT
    // carried only `Content-Type` while the server signs the filename metadata
    // too (`get_upload_url` in the API passes
    // `metadata={'original_filename': …}`).
    const SIGNED_URL =
      'https://s3.test/put?X-Amz-Algorithm=AWS4-HMAC-SHA256' +
      '&X-Amz-SignedHeaders=content-type%3Bhost%3Bx-amz-meta-original_filename'

    const putHeaders = (fetchMock: ReturnType<typeof vi.fn>): Record<string, string> => {
      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
      return Object.fromEntries(
        Object.entries(init.headers as Record<string, string>).map(([key, value]) => [
          key.toLowerCase(),
          value,
        ])
      )
    }

    it('sends every header the presigned URL declares as signed', async () => {
      const { File, fetchMock, post } = makeRepository()
      post.mockResolvedValueOnce({ upload_url: SIGNED_URL, s3_key: 'key-1' })
      fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }))
      post.mockResolvedValueOnce({ id: 'file-1' })

      await File.upload(new globalThis.File(['a'], 'report.pdf', { type: 'application/pdf' }))

      const declared = new URL(SIGNED_URL).searchParams
        .get('X-Amz-SignedHeaders')
        ?.split(';')
        .filter(name => name !== 'host')
      expect(declared).toEqual(['content-type', 'x-amz-meta-original_filename'])
      const sent = putHeaders(fetchMock)
      expect(Object.keys(sent).sort()).toEqual(declared)
      expect(sent['content-type']).toBe('application/pdf')
      expect(sent['x-amz-meta-original_filename']).toBe('report.pdf')
    })

    it('sends the ASCII-sanitized filename the server signed, not the raw one', async () => {
      // S3 metadata is ASCII-only, so the server signs
      // `sanitize_for_s3_metadata(filename)`. Echoing the raw name back is a
      // 403 for every non-ASCII filename — verified against live S3.
      const { File, fetchMock, post } = makeRepository()
      post.mockResolvedValueOnce({ upload_url: SIGNED_URL, s3_key: 'key-1' })
      fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }))
      post.mockResolvedValueOnce({ id: 'file-1' })

      await File.upload(new globalThis.File(['a'], '测试-café.md', { type: 'text/markdown' }))

      expect(putHeaders(fetchMock)['x-amz-meta-original_filename']).toBe('-cafe.md')
      // The record itself keeps the real name.
      expect(post).toHaveBeenNthCalledWith(2, '/api/v1/files/completions', {
        body: { s3_key: 'key-1', filename: '测试-café.md' },
      })
    })

    it('falls back to the server-side placeholder when a name has no ASCII at all', async () => {
      const { File, fetchMock, post } = makeRepository()
      post.mockResolvedValueOnce({ upload_url: SIGNED_URL, s3_key: 'key-1' })
      fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }))
      post.mockResolvedValueOnce({ id: 'file-1' })

      await File.upload(new Blob(['a']), { filename: '测试', mimetype: 'text/markdown' })

      expect(putHeaders(fetchMock)['x-amz-meta-original_filename']).toBe('unnamed')
    })
  })

  describe('uploadBatch', () => {
    it('uploads named files under the repeated `files` field', async () => {
      const { File, upload } = makeRepository()
      const files = [new globalThis.File(['a'], 'a.md'), new globalThis.File(['b'], 'b.md')]
      const results = [{ id: 'f-1' }, { id: 'f-2' }]
      upload.mockResolvedValueOnce(results)

      const result = await File.uploadBatch(files)

      expect(upload).toHaveBeenCalledWith('/api/v1/files/batch', files, { fieldName: 'files' })
      expect(result).toBe(results)
    })

    it('accepts React Native file parts in a batch (they always carry a name)', async () => {
      const { File, upload } = makeRepository()
      const parts = [
        { uri: 'file:///tmp/a.md', name: 'a.md', type: 'text/markdown' },
        new globalThis.File(['b'], 'b.md'),
      ]
      upload.mockResolvedValueOnce([])

      await File.uploadBatch(parts)

      expect(upload).toHaveBeenCalledWith('/api/v1/files/batch', parts, { fieldName: 'files' })
    })

    it('rejects unnamed blobs with a wrapping hint', async () => {
      const { File, upload } = makeRepository()

      await expect(
        File.uploadBatch([new globalThis.File(['a'], 'a.md'), new Blob(['b'])])
      ).rejects.toThrow('Batch file at index 1 has no filename')
      expect(upload).not.toHaveBeenCalled()
    })
  })

  it('verifies a file (`POST /files/{id}/verifications`)', async () => {
    const { File, post } = makeRepository()
    const verification = { file_id: 'file-1', db_exists: true, s3_exists: true }
    post.mockResolvedValueOnce(verification)

    const result = await File.verify('file-1')

    expect(post).toHaveBeenCalledWith('/api/v1/files/{file_id}/verifications', {
      path: { file_id: 'file-1' },
    })
    expect(result).toBe(verification)
  })

  it('reverts a note-scoped file to an earlier revision', async () => {
    const { File, post } = makeRepository()
    const reverted = { id: 'file-1', current_revision_id: 'rev-1' }
    post.mockResolvedValueOnce(reverted)

    const result = await File.revertRevision('note-1', 'file-1', 'rev-1')

    expect(post).toHaveBeenCalledWith(
      '/api/v1/notes/{note_id}/files/{file_id}/revisions/{revision_id}/revert',
      { path: { note_id: 'note-1', file_id: 'file-1', revision_id: 'rev-1' } }
    )
    expect(result).toBe(reverted)
  })
})
