import { describe, expect, it, vi } from 'vitest'
import type { AncherClient } from './api/client'
import {
  createImagePromptRepository,
  createOnboardingRepository,
  createTextSelectionRepository,
  createWebSessionRepository,
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
    Onboarding: createOnboardingRepository(client),
    WebSession: createWebSessionRepository(client),
    get,
    post,
    put,
    del,
  }
}

describe('WebSessionRepository', () => {
  it('reads the current cookie session', async () => {
    const { WebSession, get } = makeRepository()
    const session = { id: 'session-1' }
    get.mockResolvedValueOnce(session)

    await expect(WebSession.current()).resolves.toBe(session)
    expect(get).toHaveBeenCalledWith('/api/v1/web-session')
  })

  it('logs in with credentials (headers sent empty)', async () => {
    const { WebSession, post } = makeRepository()
    post.mockResolvedValueOnce(undefined)

    await WebSession.login({ email: 'a@b.c', password: 'pw' })

    expect(post).toHaveBeenCalledWith('/api/v1/web-session', {
      header: {},
      body: { email: 'a@b.c', password: 'pw' },
    })
  })

  it('logs in with an OAuth ID token and returns is_new_user', async () => {
    const { WebSession, post } = makeRepository()
    post.mockResolvedValueOnce({ is_new_user: true })

    const result = await WebSession.loginWithProvider('google', { id_token: 'token' })

    expect(post).toHaveBeenCalledWith('/api/v1/web-session/{provider}', {
      path: { provider: 'google' },
      header: {},
      body: { id_token: 'token' },
    })
    expect(result).toEqual({ is_new_user: true })
  })

  it('refreshes and logs out', async () => {
    const { WebSession, put, del } = makeRepository()
    put.mockResolvedValueOnce(undefined)
    del.mockResolvedValueOnce(undefined)

    await WebSession.refresh()
    await WebSession.logout()

    expect(put).toHaveBeenCalledWith('/api/v1/web-session', { header: {} })
    expect(del).toHaveBeenCalledWith('/api/v1/web-session')
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
