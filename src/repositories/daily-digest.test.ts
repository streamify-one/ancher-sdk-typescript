import { describe, expect, it, vi } from 'vitest'
import type { AncherClient } from '../api/client'
import { createDailyDigestRepository } from './daily-digest'

function makeRepository() {
  const get = vi.fn()
  const client = { api: { get } } as unknown as AncherClient
  return { DailyDigest: createDailyDigestRepository(client), get }
}

function page(items: unknown[], overrides: Record<string, unknown> = {}) {
  return { items, total: items.length, next_cursor: 'cursor-1', has_more: false, ...overrides }
}

describe('DailyDigestRepository', () => {
  it('binds the digest id as a path param on get', async () => {
    const { DailyDigest, get } = makeRepository()
    const digest = { id: 'digest-1', title: 'Monday digest' }
    get.mockResolvedValueOnce(digest)

    const result = await DailyDigest.get('digest-1')

    expect(get).toHaveBeenCalledWith('/api/v1/daily-digests/{digest_id}', {
      path: { digest_id: 'digest-1' },
    })
    expect(result).toBe(digest)
  })

  it('compiles list options into the wire criteria query', async () => {
    const { DailyDigest, get } = makeRepository()
    get.mockResolvedValueOnce(page([{ id: 'digest-1' }]))

    await DailyDigest.list({ where: { status: 'ready' }, orderBy: ['-created_at'], limit: 7 })

    expect(get).toHaveBeenCalledWith('/api/v1/daily-digests/', {
      query: { and: [{ status: { eq: 'ready' } }], order_by: ['-created_at'], limit: 7 },
    })
  })

  it('sends a bare query when no options are given', async () => {
    const { DailyDigest, get } = makeRepository()
    get.mockResolvedValueOnce(page([]))

    await DailyDigest.list()

    expect(get).toHaveBeenCalledWith('/api/v1/daily-digests/', { query: {} })
  })

  it('counts via a limit-1 list and reads total', async () => {
    const { DailyDigest, get } = makeRepository()
    get.mockResolvedValueOnce(page([{ id: 'digest-1' }], { total: 12 }))

    await expect(DailyDigest.count()).resolves.toBe(12)
    expect(get).toHaveBeenCalledWith('/api/v1/daily-digests/', { query: { limit: 1 } })
  })

  it('paginates with the continuation cursor and stops on has_more: false', async () => {
    const { DailyDigest, get } = makeRepository()
    get
      .mockResolvedValueOnce(page([{ id: 'a' }], { has_more: true, next_cursor: 'cursor-2' }))
      .mockResolvedValueOnce(page([{ id: 'b' }], { has_more: false }))

    const seen: string[] = []
    for await (const digest of DailyDigest.iterate({ limit: 1 })) {
      seen.push((digest as { id: string }).id)
    }

    expect(seen).toEqual(['a', 'b'])
    // The API mints a next_cursor even on the final page, so termination must
    // come from has_more — otherwise this loops forever.
    expect(get).toHaveBeenNthCalledWith(2, '/api/v1/daily-digests/', {
      query: { cursor: 'cursor-2' },
    })
  })

  it('rejects a 2xx response the transport could not parse into a page', async () => {
    const { DailyDigest, get } = makeRepository()
    get.mockResolvedValueOnce(undefined)

    await expect(DailyDigest.list()).rejects.toThrow('The API returned an empty list response.')
  })
})
