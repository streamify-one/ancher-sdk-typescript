import { describe, expect, it, vi } from 'vitest'
import type { AncherClient } from './api/client'
import {
  createActivityRepository,
  createImagePromptRepository,
  createOnboardingRepository,
  createTextSelectionRepository,
} from './services'

function makeRepository() {
  const get = vi.fn()
  const post = vi.fn()
  const put = vi.fn()
  const del = vi.fn()
  const client = {
    api: { get, post, put, delete: del },
  } as unknown as AncherClient

  return {
    Activity: createActivityRepository(client),
    Onboarding: createOnboardingRepository(client),
    get,
    post,
    put,
    del,
  }
}

describe('ActivityRepository', () => {
  it('reads aggregated daily usage for the requested local-date window', async () => {
    const { Activity, get } = makeRepository()
    const usage = {
      days: [{ date: '2026-07-06', captures: 2, creations: 1 }],
      totals: { captures: 2, creations: 1, active_days: 1 },
    }
    get.mockResolvedValueOnce(usage)

    const query = { from: '2026-01-12', to: '2026-07-12', timezone: 'Asia/Shanghai' } as const

    await expect(Activity.usage(query)).resolves.toBe(usage)
    expect(get).toHaveBeenCalledWith('/api/v1/activity/usage', { query })
  })
})

describe('TextSelectionRepository', () => {
  function makeTextSelection() {
    const post = vi.fn()
    const client = { api: { post } } as unknown as AncherClient
    return { TextSelection: createTextSelectionRepository(client), post }
  }

  it('explains the selected text', async () => {
    const { TextSelection, post } = makeTextSelection()
    post.mockResolvedValueOnce({ content: 'explanation' })

    await expect(TextSelection.explain('some text')).resolves.toEqual({ content: 'explanation' })
    expect(post).toHaveBeenCalledWith('/api/v1/text-selections/explanations', {
      body: { text: 'some text' },
    })
  })

  it('summarizes the selected text', async () => {
    const { TextSelection, post } = makeTextSelection()
    post.mockResolvedValueOnce({ content: 'summary' })

    await expect(TextSelection.summarize('long text')).resolves.toEqual({ content: 'summary' })
    expect(post).toHaveBeenCalledWith('/api/v1/text-selections/summaries', {
      body: { text: 'long text' },
    })
  })

  it('translates into an explicit target language', async () => {
    const { TextSelection, post } = makeTextSelection()
    post.mockResolvedValueOnce({ content: '你好' })

    await expect(TextSelection.translate('hello', 'Simplified Chinese')).resolves.toEqual({
      content: '你好',
    })
    expect(post).toHaveBeenCalledWith('/api/v1/text-selections/translations', {
      body: { text: 'hello', target_language: 'Simplified Chinese' },
    })
  })
})

describe('OnboardingRepository', () => {
  it('reads the checklist', async () => {
    const { Onboarding, get } = makeRepository()
    const status = { tasks: [], claimable_credits: '0' }
    get.mockResolvedValueOnce(status)

    await expect(Onboarding.status()).resolves.toBe(status)
    expect(get).toHaveBeenCalledWith('/api/v1/onboarding')
  })

  it('claims a reward by task key', async () => {
    const { Onboarding, post } = makeRepository()
    const reward = {
      task: 'first_note',
      credits_granted: '500',
      claimed_at: '2026-08-05T12:00:00Z',
    }
    post.mockResolvedValueOnce(reward)

    await expect(Onboarding.claimReward('first_note')).resolves.toBe(reward)
    expect(post).toHaveBeenCalledWith('/api/v1/onboarding/{task}/reward', {
      path: { task: 'first_note' },
    })
  })
})

describe('ImagePromptRepository', () => {
  it("uploads under the endpoint's `image` multipart field", async () => {
    const upload = vi.fn().mockResolvedValueOnce({ prompt: 'a cat' })
    const client = { upload } as unknown as AncherClient
    const ImagePrompt = createImagePromptRepository(client)
    const image = new Blob(['png'])
    const signal = new AbortController().signal

    const result = await ImagePrompt.generate(image, { signal })

    expect(upload).toHaveBeenCalledWith('/api/v1/image-prompts/', image, {
      signal,
      fieldName: 'image',
    })
    expect(result).toEqual({ prompt: 'a cat' })
  })
})
