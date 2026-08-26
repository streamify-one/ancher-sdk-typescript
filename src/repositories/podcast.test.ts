import { describe, expect, it, vi } from 'vitest'
import type { AncherClient } from '../api/client'
import { createPodcastRepository } from './podcast'

function makeRepository() {
  const get = vi.fn()
  const post = vi.fn()
  const client = { api: { get, post } } as unknown as AncherClient
  return { Podcast: createPodcastRepository(client), get, post }
}

describe('PodcastRepository', () => {
  it('binds the note id as a path param on createForNote', async () => {
    const { Podcast, post } = makeRepository()
    const podcast = { id: 'podcast-1', note_id: 'note-1', status: 'processing' }
    post.mockResolvedValueOnce(podcast)

    const result = await Podcast.createForNote('note-1')

    expect(post).toHaveBeenCalledWith('/api/v1/notes/{note_id}/podcasts', {
      path: { note_id: 'note-1' },
    })
    expect(result).toBe(podcast)
  })

  it('sends no request body — the note id is the whole request', async () => {
    const { Podcast, post } = makeRepository()
    post.mockResolvedValueOnce({ id: 'podcast-1' })

    await Podcast.createForNote('note-1')

    expect(post.mock.calls[0]?.[1]).not.toHaveProperty('body')
  })

  it('binds the podcast id as a path param on get', async () => {
    const { Podcast, get } = makeRepository()
    const podcast = { id: 'podcast-1', status: 'ready', file_id: 'file-1' }
    get.mockResolvedValueOnce(podcast)

    const result = await Podcast.get('podcast-1')

    expect(get).toHaveBeenCalledWith('/api/v1/podcasts/{podcast_id}', {
      path: { podcast_id: 'podcast-1' },
    })
    expect(result).toBe(podcast)
  })

  it('forwards an abort signal so a poll tick can be dropped', async () => {
    const { Podcast, get } = makeRepository()
    const signal = new AbortController().signal
    get.mockResolvedValueOnce({ id: 'podcast-1' })

    await Podcast.get('podcast-1', { signal })

    expect(get).toHaveBeenCalledWith('/api/v1/podcasts/{podcast_id}', {
      path: { podcast_id: 'podcast-1' },
      overrides: { signal },
    })
  })

  it('omits the overrides key entirely when no signal is given', async () => {
    const { Podcast, get } = makeRepository()
    get.mockResolvedValueOnce({ id: 'podcast-1' })

    await Podcast.get('podcast-1', {})

    expect(get.mock.calls[0]?.[1]).not.toHaveProperty('overrides')
  })

  it('propagates a rejected request rather than swallowing it', async () => {
    const { Podcast, post } = makeRepository()
    post.mockRejectedValueOnce(new Error('insufficient credits'))

    await expect(Podcast.createForNote('note-1')).rejects.toThrow('insufficient credits')
  })
})
