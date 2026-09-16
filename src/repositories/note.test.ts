import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import type { AncherClient } from '../api/client'
import type { Page } from '../contracts/common'
import type { FileInfo, FileUploadResponse } from '../contracts/file'
import type { CollectionSuggestion } from '../contracts/suggestion'
import { createNoteRepository, type NoteRepository } from './note'

function makeRepository() {
  const get = vi.fn()
  const post = vi.fn()
  const fetchMock = vi.fn()
  const request = vi.fn()
  const upload = vi.fn()
  const client = {
    api: { get, post },
    config: { fetch: fetchMock },
    request,
    upload,
  } as unknown as AncherClient

  return { Note: createNoteRepository(client), fetchMock, get, post, request, upload }
}

function mintResponse(downloadUrl = 'https://cdn.test/body.md') {
  return new Response(JSON.stringify({ download_url: downloadUrl, expires_in: 300 }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

describe('NoteRepository', () => {
  it('returns the version-compatible file contract from note-scoped metadata reads', () => {
    expectTypeOf<ReturnType<NoteRepository['getFile']>>().toEqualTypeOf<Promise<FileInfo>>()
  })

  it('returns the version-compatible file contract after content updates', () => {
    expectTypeOf<ReturnType<NoteRepository['updateFileContent']>>().toEqualTypeOf<
      Promise<FileUploadResponse>
    >()
  })

  it('returns suggestions with version-compatible embedded notes', () => {
    expectTypeOf<ReturnType<NoteRepository['suggestedCollections']>>().toEqualTypeOf<
      Promise<Page<CollectionSuggestion>>
    >()
  })

  it('forwards multiple file ids when creating a combined note', async () => {
    const { Note, post } = makeRepository()
    const createdNote = { id: 'note-1' }
    post.mockResolvedValueOnce(createdNote)

    const result = await Note.createFromFile({
      file_ids: ['file-1', 'file-2'],
      comment: 'Quarterly reports',
    })

    expect(post).toHaveBeenCalledWith('/api/v1/notes/files', {
      body: {
        file_ids: ['file-1', 'file-2'],
        comment: 'Quarterly reports',
      },
    })
    expect(result).toBe(createdNote)
  })

  it('mints a note display presigned URL', async () => {
    const { Note, post } = makeRepository()
    post.mockResolvedValueOnce({ download_url: 'https://cdn.test/display' })

    const url = await Note.displayPresignedUrl('note-1', { revision: 2 })

    expect(post).toHaveBeenCalledWith('/api/v1/notes/{note_id}/display/presigned-urls', {
      path: { note_id: 'note-1' },
      query: { revision: 2 },
    })
    expect(url).toBe('https://cdn.test/display')
  })

  it('mints a note-scoped file presigned URL', async () => {
    const { Note, post } = makeRepository()
    post.mockResolvedValueOnce({ download_url: 'https://cdn.test/file' })

    const url = await Note.filePresignedUrl('note-1', 'file-1', { w: 720, h: null })

    expect(post).toHaveBeenCalledWith(
      '/api/v1/notes/{note_id}/files/{file_id}/content/presigned-urls',
      {
        path: { note_id: 'note-1', file_id: 'file-1' },
        query: { w: 720, h: null },
      }
    )
    expect(url).toBe('https://cdn.test/file')
  })

  it('downloads a note display response', async () => {
    const { Note, fetchMock, post } = makeRepository()
    const response = new Response('payload')
    post.mockResolvedValueOnce({ download_url: 'https://cdn.test/display' })
    fetchMock.mockResolvedValueOnce(response)

    const result = await Note.downloadDisplay('note-1')

    expect(fetchMock).toHaveBeenCalledWith('https://cdn.test/display', { signal: undefined })
    expect(result).toBe(response)
  })

  it('downloads a note-scoped file response', async () => {
    const { Note, fetchMock, post } = makeRepository()
    const response = new Response('payload')
    post.mockResolvedValueOnce({ download_url: 'https://cdn.test/file' })
    fetchMock.mockResolvedValueOnce(response)

    const result = await Note.downloadFile('note-1', 'file-1')

    expect(fetchMock).toHaveBeenCalledWith('https://cdn.test/file', { signal: undefined })
    expect(result).toBe(response)
  })

  describe('getContent', () => {
    it('mints a presigned URL then reads the CDN through the configured fetch', async () => {
      const { Note, request, fetchMock } = makeRepository()
      const response = new Response('# markdown')
      request.mockResolvedValueOnce(mintResponse())
      fetchMock.mockResolvedValueOnce(response)

      const result = await Note.getContent('note-1')

      // The mint carries credentials and records the open...
      expect(request).toHaveBeenCalledWith('/api/v1/notes/note-1/content/presigned-urls', {
        method: 'POST',
        signal: null,
      })
      // ...the CDN hop goes through the host app's transport, so desktop can
      // route it natively and web can proxy it in dev.
      expect(fetchMock).toHaveBeenCalledWith('https://cdn.test/body.md', { signal: null })
      expect(result).toBe(response)
    })

    it('forwards the revision as a query param on the mint', async () => {
      const { Note, request, fetchMock } = makeRepository()
      request.mockResolvedValueOnce(mintResponse())
      fetchMock.mockResolvedValueOnce(new Response('old'))

      await Note.getContent('note-1', { revision: 3 })

      expect(request).toHaveBeenCalledWith(
        '/api/v1/notes/note-1/content/presigned-urls?revision=3',
        { method: 'POST', signal: null }
      )
    })

    it('throws when the CDN read fails, without masking it as an API error', async () => {
      const { Note, request, fetchMock } = makeRepository()
      request.mockResolvedValueOnce(mintResponse())
      fetchMock.mockResolvedValueOnce(new Response(null, { status: 403 }))

      await expect(Note.getContent('note-1')).rejects.toThrow(/403/)
    })

    it('throws an API error on a non-2xx status', async () => {
      const { Note, request } = makeRepository()
      request.mockResolvedValueOnce(new Response(null, { status: 404 }))

      await expect(Note.getContent('note-1')).rejects.toThrow('Note content fetch failed')
    })
  })

  it('gets note-scoped file metadata', async () => {
    const { Note, get } = makeRepository()
    const info = { id: 'file-1', filename: 'content.md' }
    get.mockResolvedValueOnce(info)

    const result = await Note.getFile('note-1', 'file-1')

    expect(get).toHaveBeenCalledWith('/api/v1/notes/{note_id}/files/{file_id}', {
      path: { note_id: 'note-1', file_id: 'file-1' },
    })
    expect(result).toBe(info)
  })

  it('replaces a note content file via multipart PUT', async () => {
    const { Note, upload } = makeRepository()
    const updated = { id: 'file-1', filename: 'content.md' }
    const blob = new Blob(['# updated'])
    upload.mockResolvedValueOnce(updated)

    const result = await Note.updateFileContent('note-1', 'file-1', blob, {
      filename: 'content.md',
    })

    expect(upload).toHaveBeenCalledWith('/api/v1/notes/note-1/files/file-1/content', blob, {
      filename: 'content.md',
      method: 'PUT',
    })
    expect(result).toBe(updated)
  })

})
