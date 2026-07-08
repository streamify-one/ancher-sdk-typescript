import { describe, expect, it, vi } from 'vitest'
import type { ChatEvent } from './chat'
import { consumeChat, parseChatStream } from './chat'

// ---------------------------------------------------------------------------
// Helpers — build SSE `Response` bodies from newline-delimited JSON envelopes.
// ---------------------------------------------------------------------------

const encoder = new TextEncoder()

/** Serialize one envelope into a complete SSE frame (`data:` line + blank line). */
function frame(envelope: unknown): string {
  const payload = typeof envelope === 'string' ? envelope : JSON.stringify(envelope)
  return `data: ${payload}\n\n`
}

/** Build a `Response` whose body streams the given raw SSE chunks. */
function sseResponse(chunks: string[]): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk))
      controller.close()
    },
  })
  return new Response(stream)
}

/** Build a `Response` from a list of envelopes, one frame each. */
function envelopeResponse(envelopes: unknown[]): Response {
  return sseResponse(envelopes.map(frame))
}

/** Drain an async generator of `ChatEvent`s into an array. */
async function collect(stream: AsyncGenerator<ChatEvent>): Promise<ChatEvent[]> {
  const events: ChatEvent[] = []
  for await (const event of stream) events.push(event)
  return events
}

// A minimal `trace` envelope carrying a pydantic-ai run event.
function traceEnvelope(payload: unknown, overrides: Record<string, unknown> = {}): unknown {
  return {
    type: 'trace',
    delta: {
      agent_name: 'main',
      parent_run_id: null,
      root_run_id: 'root-1',
      run_id: 'run-1',
      payload,
      ...overrides,
    },
  }
}

describe('parseChatStream', () => {
  it('maps a `content` delta envelope to a text event', async () => {
    const events = await collect(parseChatStream(envelopeResponse([{ type: 'content', delta: 'hello' }])))
    expect(events).toEqual([{ type: 'text', text: 'hello', run: null }])
  })

  it('yields a text event then ends the stream on `done`', async () => {
    const events = await collect(
      parseChatStream(
        envelopeResponse([
          { type: 'content', delta: 'hi' },
          { type: 'done', finish_reason: 'stop' },
        ])
      )
    )
    expect(events).toEqual([
      { type: 'text', text: 'hi', run: null },
      { type: 'done', finishReason: 'stop' },
    ])
  })

  it('defaults the finish reason to `stop` when omitted', async () => {
    const events = await collect(parseChatStream(envelopeResponse([{ type: 'done' }])))
    expect(events).toEqual([{ type: 'done', finishReason: 'stop' }])
  })

  it('stops iterating after `done`, dropping any later frames', async () => {
    const events = await collect(
      parseChatStream(
        envelopeResponse([
          { type: 'done', finish_reason: 'stop' },
          { type: 'content', delta: 'after done — should never surface' },
        ])
      )
    )
    expect(events).toEqual([{ type: 'done', finishReason: 'stop' }])
  })

  it('maps an `error` envelope to an error event and ends the stream', async () => {
    const events = await collect(
      parseChatStream(
        envelopeResponse([
          { type: 'error', error: { code: 'API-XYZ001', message: 'boom', details: { retry: false } } },
          { type: 'content', delta: 'unreachable' },
        ])
      )
    )
    expect(events).toEqual([
      { type: 'error', code: 'API-XYZ001', message: 'boom', details: { retry: false } },
    ])
  })

  it('falls back to a generic message for an error envelope with no message', async () => {
    const [event] = await collect(parseChatStream(envelopeResponse([{ type: 'error' }])))
    expect(event).toEqual({ type: 'error', code: undefined, message: 'Chat stream error', details: undefined })
  })

  it('terminates on a `[DONE]` sentinel frame without emitting an event', async () => {
    const events = await collect(
      parseChatStream(
        envelopeResponse([
          { type: 'content', delta: 'chunk' },
          '[DONE]',
          { type: 'content', delta: 'after DONE' },
        ])
      )
    )
    expect(events).toEqual([{ type: 'text', text: 'chunk', run: null }])
  })

  it('maps a trace `part_start` text part to a text event with a main run', async () => {
    const [event] = await collect(
      parseChatStream(
        envelopeResponse([traceEnvelope({ event_kind: 'part_start', part: { part_kind: 'text', content: 'Hi' } })])
      )
    )
    expect(event).toEqual({
      type: 'text',
      text: 'Hi',
      run: {
        runId: 'run-1',
        agentName: 'main',
        parentRunId: null,
        rootRunId: 'root-1',
        isMain: true,
      },
    })
  })

  it('maps a trace `part_delta` text delta to a text event', async () => {
    const [event] = await collect(
      parseChatStream(
        envelopeResponse([
          traceEnvelope({ event_kind: 'part_delta', delta: { part_delta_kind: 'text', content_delta: 'lo' } }),
        ])
      )
    )
    expect(event).toMatchObject({ type: 'text', text: 'lo' })
  })

  it('maps a trace thinking `part_delta` to a thinking event', async () => {
    const [event] = await collect(
      parseChatStream(
        envelopeResponse([
          traceEnvelope({
            event_kind: 'part_delta',
            delta: { part_delta_kind: 'thinking', content_delta: 'hmm' },
          }),
        ])
      )
    )
    expect(event).toMatchObject({ type: 'thinking', text: 'hmm' })
  })

  it('maps a `function_tool_call` trace to a tool-call event', async () => {
    const [event] = await collect(
      parseChatStream(
        envelopeResponse([
          traceEnvelope({
            event_kind: 'function_tool_call',
            part: { tool_name: 'search', tool_call_id: 'tc-1', args: { q: 'cats' } },
          }),
        ])
      )
    )
    expect(event).toMatchObject({
      type: 'tool-call',
      toolName: 'search',
      toolCallId: 'tc-1',
      args: { q: 'cats' },
    })
  })

  it('maps a `function_tool_result` trace to a tool-return event', async () => {
    const [event] = await collect(
      parseChatStream(
        envelopeResponse([
          traceEnvelope({
            event_kind: 'function_tool_result',
            part: { tool_name: 'search', tool_call_id: 'tc-1', content: { hits: 2 } },
          }),
        ])
      )
    )
    expect(event).toMatchObject({
      type: 'tool-return',
      toolName: 'search',
      toolCallId: 'tc-1',
      content: { hits: 2 },
    })
  })

  it('maps a `citations` envelope, defaulting missing fields', async () => {
    const [event] = await collect(
      parseChatStream(
        envelopeResponse([
          {
            type: 'citations',
            citations: {
              search_queries: ['cats'],
              citations: [{ url: 'https://ex.com', title: 'Cats' }],
            },
          },
        ])
      )
    )
    expect(event).toEqual({
      type: 'citations',
      searchQueries: ['cats'],
      citations: [{ url: 'https://ex.com', title: 'Cats', snippet: '', siteName: '' }],
    })
  })

  it('maps a `resource_updated` envelope', async () => {
    const [event] = await collect(
      parseChatStream(
        envelopeResponse([
          {
            type: 'resource_updated',
            resource_updates: {
              resources: [{ resource_type: 'note', resource_id: 'n1', fields: ['title'] }],
            },
          },
        ])
      )
    )
    expect(event).toEqual({
      type: 'resource-updated',
      resources: [{ resourceType: 'note', resourceId: 'n1', fields: ['title'] }],
    })
  })

  it('maps `narration` and `review_rejected` envelopes', async () => {
    const events = await collect(
      parseChatStream(
        envelopeResponse([
          { type: 'narration', delta: 'thinking out loud' },
          { type: 'review_rejected', delta: 'nope' },
        ])
      )
    )
    expect(events).toEqual([
      { type: 'narration', text: 'thinking out loud' },
      { type: 'review-rejected', text: 'nope' },
    ])
  })

  it('reassembles a JSON payload split across multiple `data:` lines', async () => {
    // dispatch() joins buffered data lines with `\n`, so a split JSON must parse.
    const events = await collect(
      parseChatStream(sseResponse(['data: {"type":"content",\ndata: "delta":"split"}\n\n']))
    )
    expect(events).toEqual([{ type: 'text', text: 'split', run: null }])
  })

  it('handles frames delivered across chunk boundaries', async () => {
    const full = frame({ type: 'content', delta: 'boundary' }) + frame({ type: 'done', finish_reason: 'stop' })
    // Split mid-frame so the parser must buffer across reads.
    const mid = Math.floor(full.length / 3)
    const events = await collect(parseChatStream(sseResponse([full.slice(0, mid), full.slice(mid)])))
    expect(events).toEqual([
      { type: 'text', text: 'boundary', run: null },
      { type: 'done', finishReason: 'stop' },
    ])
  })

  it('ignores SSE comment lines, `event:`/`id:` lines and `{}` pings', async () => {
    const events = await collect(
      parseChatStream(
        sseResponse([
          ': keepalive\n',
          'event: ping\n',
          'id: 42\n',
          'data: {}\n\n',
          frame({ type: 'content', delta: 'real' }),
        ])
      )
    )
    expect(events).toEqual([{ type: 'text', text: 'real', run: null }])
  })

  it('skips frames whose payload is not valid JSON', async () => {
    const events = await collect(
      parseChatStream(sseResponse(['data: not-json\n\n', frame({ type: 'content', delta: 'ok' })]))
    )
    expect(events).toEqual([{ type: 'text', text: 'ok', run: null }])
  })

  it('yields nothing for a response with no body', async () => {
    const events = await collect(parseChatStream({ body: null } as unknown as Response))
    expect(events).toEqual([])
  })

  it('tolerates CRLF line endings', async () => {
    const events = await collect(
      parseChatStream(sseResponse([`data: ${JSON.stringify({ type: 'content', delta: 'crlf' })}\r\n\r\n`]))
    )
    expect(events).toEqual([{ type: 'text', text: 'crlf', run: null }])
  })

  it('dispatches a trailing frame that is not terminated by a blank line', async () => {
    // No blank line after the last frame — parseChatStream flushes it post-loop.
    const events = await collect(
      parseChatStream(sseResponse([`data: ${JSON.stringify({ type: 'content', delta: 'tail' })}\n`]))
    )
    expect(events).toEqual([{ type: 'text', text: 'tail', run: null }])
  })

  it('cancels the underlying reader when the consumer breaks early', async () => {
    const cancel = vi.fn()
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        // Enqueue two frames but never close, so the stream stays open.
        controller.enqueue(encoder.encode(frame({ type: 'content', delta: 'first' })))
        controller.enqueue(encoder.encode(frame({ type: 'content', delta: 'second' })))
      },
      cancel,
    })
    const response = new Response(stream)

    const seen: ChatEvent[] = []
    for await (const event of parseChatStream(response)) {
      seen.push(event)
      break // early exit → generator `finally` should cancel the reader
    }

    expect(seen).toEqual([{ type: 'text', text: 'first', run: null }])
    expect(cancel).toHaveBeenCalledTimes(1)
  })
})

describe('consumeChat', () => {
  it('accumulates main-agent text and resolves the finish reason', async () => {
    const stream = parseChatStream(
      envelopeResponse([
        { type: 'content', delta: 'Hello ' },
        { type: 'content', delta: 'world' },
        { type: 'done', finish_reason: 'stop' },
      ])
    )
    const onText = vi.fn()
    const onDone = vi.fn()
    const result = await consumeChat(stream, { onText, onDone })

    expect(result).toEqual({ text: 'Hello world', finishReason: 'stop' })
    expect(onText).toHaveBeenCalledTimes(2)
    expect(onDone).toHaveBeenCalledWith('stop')
  })

  it('routes error events to onError and does not set a finish reason', async () => {
    const stream = parseChatStream(
      envelopeResponse([{ type: 'error', error: { code: 'API-XYZ001', message: 'boom' } }])
    )
    const onError = vi.fn()
    const onEvent = vi.fn()
    const result = await consumeChat(stream, { onError, onEvent })

    expect(result).toEqual({ text: '', finishReason: null })
    expect(onEvent).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledWith({ code: 'API-XYZ001', message: 'boom', details: undefined })
  })

  it('excludes non-main sub-agent text from the accumulated result', async () => {
    const stream = parseChatStream(
      envelopeResponse([
        // Main run establishes itself first (parent_run_id null).
        traceEnvelope({ event_kind: 'part_start', part: { part_kind: 'text', content: 'main ' } }),
        // A sub-agent run — its text should not be accumulated.
        traceEnvelope(
          { event_kind: 'part_start', part: { part_kind: 'text', content: 'sub' } },
          { run_id: 'run-2', parent_run_id: 'run-1' }
        ),
        { type: 'done', finish_reason: 'stop' },
      ])
    )
    const result = await consumeChat(stream)
    expect(result.text).toBe('main ')
    expect(result.finishReason).toBe('stop')
  })
})
