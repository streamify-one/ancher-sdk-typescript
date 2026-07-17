import { describe, expect, it } from 'vitest'
import type { SSEDoneEvent, SuggestedAction } from './contracts/conversation'
import { createInitialStreamState, processSSEBuffer } from './sse-conversation'

const CONV = '11111111-1111-4111-8111-111111111111'
const MSG = '22222222-2222-4222-8222-222222222222'

/** Serialize a `done` envelope into a complete SSE frame. */
function doneFrame(overrides: Partial<SSEDoneEvent> = {}): string {
  const event: SSEDoneEvent = {
    type: 'done',
    conversation_id: CONV,
    message_id: MSG,
    created_at: 1_700_000_000,
    finish_reason: 'stop',
    ...overrides,
  }
  return `data: ${JSON.stringify(event)}\n\n`
}

describe('processSSEBuffer — done envelope suggested actions', () => {
  it('captures suggested_actions from the terminal done event', () => {
    const state = createInitialStreamState()
    const actions: SuggestedAction[] = [
      { description: 'Draft a reply', prompt: 'Write a reply to this thread', confidence: 0.4 },
      { description: 'Summarize', prompt: 'Summarize the thread', confidence: 0.9 },
    ]

    processSSEBuffer(doneFrame({ suggested_actions: actions }), state, {})

    expect(state.terminalReceived).toBe(true)
    expect(state.suggestedActions).toEqual(actions)
  })

  it('leaves suggestedActions undefined when the done event omits them', () => {
    const state = createInitialStreamState()

    processSSEBuffer(doneFrame(), state, {})

    expect(state.terminalReceived).toBe(true)
    expect(state.suggestedActions).toBeUndefined()
  })

  it('normalizes a null suggested_actions payload to undefined', () => {
    const state = createInitialStreamState()

    processSSEBuffer(doneFrame({ suggested_actions: null }), state, {})

    expect(state.suggestedActions).toBeUndefined()
  })
})
