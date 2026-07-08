import { describe, expect, it, vi } from 'vitest'
import type { AncherClient } from '../api/client'
import { createNoteRepository } from './note'

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

describe('NoteRepository', () => {
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
    it('fetches the raw content response through the request escape hatch', async () => {
      const { Note, request } = makeRepository()
      const response = new Response('# markdown')
      request.mockResolvedValueOnce(response)

      const result = await Note.getContent('note-1')

      expect(request).toHaveBeenCalledWith('/api/v1/notes/note-1/content', { signal: null })
      expect(result).toBe(response)
    })

    it('forwards the revision as a query param', async () => {
      const { Note, request } = makeRepository()
      request.mockResolvedValueOnce(new Response('old'))

      await Note.getContent('note-1', { revision: 3 })

      expect(request).toHaveBeenCalledWith('/api/v1/notes/note-1/content?revision=3', {
        signal: null,
      })
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
