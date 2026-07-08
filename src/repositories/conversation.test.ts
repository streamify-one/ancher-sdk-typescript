import { describe, expect, it, vi } from 'vitest'
import type { AncherClient } from '../api/client'
import { createConversationRepository } from './conversation'

function makeRepository() {
  const post = vi.fn()
  const client = { api: { post } } as unknown as AncherClient
  return { Conversation: createConversationRepository(client), post }
}

describe('ConversationRepository run triggers', () => {
  it('threads an abort signal into the start POST via overrides', async () => {
    const { Conversation, post } = makeRepository()
    const receipt = { conversation_id: 'c-1', status: 'running' }
    const signal = new AbortController().signal
    post.mockResolvedValueOnce(receipt)

    const result = await Conversation.start({ content: 'hi' }, { signal })

    expect(post).toHaveBeenCalledWith('/api/v1/conversations', {
      body: { content: 'hi' },
      overrides: { signal },
    })
    expect(result).toBe(receipt)
  })

  it('sends without overrides when no signal is given', async () => {
    const { Conversation, post } = makeRepository()
    post.mockResolvedValueOnce({ conversation_id: 'c-1', status: 'running' })

    await Conversation.send('c-1', { content: 'hi' })

    expect(post).toHaveBeenCalledWith('/api/v1/conversations/{conversation_id}', {
      path: { conversation_id: 'c-1' },
      body: { content: 'hi' },
    })
  })

  it('threads an abort signal into the send POST via overrides', async () => {
    const { Conversation, post } = makeRepository()
    const signal = new AbortController().signal
    post.mockResolvedValueOnce({ conversation_id: 'c-1', status: 'running' })

    await Conversation.send('c-1', { content: 'hi' }, { signal })

    expect(post).toHaveBeenCalledWith('/api/v1/conversations/{conversation_id}', {
      path: { conversation_id: 'c-1' },
      body: { content: 'hi' },
      overrides: { signal },
    })
  })
})
