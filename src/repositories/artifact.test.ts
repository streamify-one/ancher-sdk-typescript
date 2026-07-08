import { describe, expect, it, vi } from 'vitest'
import type { AncherClient } from '../api/client'
import { createArtifactRepository } from './artifact'

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

  return { Artifact: createArtifactRepository(client), fetchMock, get, post, request, upload }
}

describe('ArtifactRepository', () => {
  describe('presignedUrl', () => {
    it('mints a content presigned URL by default', async () => {
      const { Artifact, post } = makeRepository()
      post.mockResolvedValueOnce({ download_url: 'https://cdn.test/content' })

      const url = await Artifact.presignedUrl('artifact-1')

      expect(post).toHaveBeenCalledWith(
        '/api/v1/artifacts/{artifact_id}/content/presigned-urls',
        { path: { artifact_id: 'artifact-1' }, query: {} }
      )
      expect(url).toBe('https://cdn.test/content')
    })

    it('mints a display presigned URL with forwarded query options', async () => {
      const { Artifact, post } = makeRepository()
      post.mockResolvedValueOnce({ download_url: 'https://cdn.test/display' })

      const url = await Artifact.presignedUrl('artifact-1', {
        kind: 'display',
        revision: 2,
        expiration: 300,
        w: 720,
        h: null,
      })

      expect(post).toHaveBeenCalledWith(
        '/api/v1/artifacts/{artifact_id}/display/presigned-urls',
        {
          path: { artifact_id: 'artifact-1' },
          query: { revision: 2, expiration: 300, w: 720, h: null },
        }
      )
      expect(url).toBe('https://cdn.test/display')
    })

    it('mints a thumbnail presigned URL', async () => {
      const { Artifact, post } = makeRepository()
      post.mockResolvedValueOnce({ download_url: 'https://cdn.test/thumbnail' })

      const url = await Artifact.presignedUrl('artifact-1', { kind: 'thumbnail', w: 320 })

      expect(post).toHaveBeenCalledWith(
        '/api/v1/artifacts/{artifact_id}/thumbnail/presigned-urls',
        { path: { artifact_id: 'artifact-1' }, query: { w: 320 } }
      )
      expect(url).toBe('https://cdn.test/thumbnail')
    })
  })

  describe('download', () => {
    it('mints a presigned URL and fetches it without credentials', async () => {
      const { Artifact, fetchMock, post } = makeRepository()
      const response = new Response('payload')
      const signal = new AbortController().signal
      post.mockResolvedValueOnce({ download_url: 'https://cdn.test/content' })
      fetchMock.mockResolvedValueOnce(response)

      const result = await Artifact.download('artifact-1', { signal })

      expect(post).toHaveBeenCalledWith(
        '/api/v1/artifacts/{artifact_id}/content/presigned-urls',
        { path: { artifact_id: 'artifact-1' }, query: {} }
      )
      expect(fetchMock).toHaveBeenCalledWith('https://cdn.test/content', { signal })
      expect(result).toBe(response)
    })

    it('throws when the CDN fetch fails', async () => {
      const { Artifact, fetchMock, post } = makeRepository()
      post.mockResolvedValueOnce({ download_url: 'https://cdn.test/content' })
      fetchMock.mockResolvedValueOnce(new Response(null, { status: 403 }))

      await expect(Artifact.download('artifact-1')).rejects.toThrow(
        'Artifact download failed with status 403'
      )
    })
  })

  describe('getContent', () => {
    it('fetches the raw content response with an optional revision', async () => {
      const { Artifact, request } = makeRepository()
      const response = new Response('<html/>')
      request.mockResolvedValueOnce(response)

      const result = await Artifact.getContent('artifact-1', { revision: 2 })

      expect(request).toHaveBeenCalledWith('/api/v1/artifacts/artifact-1/content?revision=2', {
        signal: null,
      })
      expect(result).toBe(response)
    })

    it('throws an API error on a non-2xx status', async () => {
      const { Artifact, request } = makeRepository()
      request.mockResolvedValueOnce(new Response(null, { status: 403 }))

      await expect(Artifact.getContent('artifact-1')).rejects.toThrow(
        'Artifact content fetch failed'
      )
    })
  })

  it('replaces the content file via multipart PUT', async () => {
    const { Artifact, upload } = makeRepository()
    const updated = { id: 'content-file' }
    const blob = new Blob(['# v2'])
    upload.mockResolvedValueOnce(updated)

    const result = await Artifact.updateContent('artifact-1', blob)

    expect(upload).toHaveBeenCalledWith('/api/v1/artifacts/artifact-1/content', blob, {
      method: 'PUT',
    })
    expect(result).toBe(updated)
  })
})
