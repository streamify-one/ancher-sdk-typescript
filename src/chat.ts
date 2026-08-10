/**
 * Conversation chat streaming — a **structured** consumer over the raw SSE
 * stream (`GET /conversations/{id}/stream`).
 *
 * The wire stream is standard SSE (`event:` / `data:` lines, a `data: [DONE]`
 * terminator and `event: ping` keepalives). Each `data:` frame is a
 * `ConversationStreamResponse` envelope discriminated by `type`. The live
 * assistant text + tool activity arrive as `trace` envelopes wrapping pydantic-ai
 * events; `content` is a plain-text fallback.
 *
 * Rather than surfacing those raw envelopes, this module fans them out into a
 * typed {@link ChatEvent} discriminated union (text / thinking / tool-call /
 * tool-return / citations / clarification / done / error / …), each text/tool
 * event carrying a typed {@link AgentRun}. Consume it as an async iterator
 * (`for await`) or with callbacks via {@link consumeChat}.
 */

import { buildContextHeaders, sendWithSessionRefresh } from './api/auth'
import type { AncherClient } from './api/client'
import type { AncherClientConfig } from './api/config'
import { buildApiError } from './api/errors'
import type { Schemas } from './api/generated/api.client'
import { newTraceId } from './api/trace'

// ---------------------------------------------------------------------------
// Structured event surface
// ---------------------------------------------------------------------------

/** Identity of the agent that emitted an event. */
export interface AgentRun {
  agentName: string
  /** The user-visible main agent (the first run seen with no parent). */
  isMain: boolean
  parentRunId: string | null
  rootRunId: string
  runId: string
}

export interface ChatCitation {
  siteName: string
  snippet: string
  title: string
  url: string
}

export interface ChatResourceUpdate {
  fields: string[]
  resourceId: string
  resourceType: 'note' | 'artifact'
}

export type ChatFinishReason = 'stop' | 'error' | 'cancelled' | 'clarification_requested'

/** A structured chat-stream event. */
export type ChatEvent =
  | { type: 'text'; text: string; run: AgentRun | null }
  | { type: 'thinking'; text: string; run: AgentRun }
  | { type: 'tool-call'; toolName: string; toolCallId: string; args: unknown; run: AgentRun }
  | { type: 'tool-return'; toolName: string; toolCallId: string; content: unknown; run: AgentRun }
  | { type: 'narration'; text: string }
  | { type: 'review-rejected'; text: string }
  | { type: 'citations'; citations: ChatCitation[]; searchQueries: string[] }
  | { type: 'resource-updated'; resources: ChatResourceUpdate[] }
  | { type: 'clarification-requested'; clarification: Schemas.ClarificationRequestedEvent }
  | { type: 'clarification-resolved'; clarification: Schemas.ClarificationResolvedEvent }
  | { type: 'done'; finishReason: ChatFinishReason }
  | { type: 'error'; code?: string; message: string; details?: unknown }

export interface ChatStreamOptions {
  /** Resume after this Redis Stream event id (omit to replay from the start). */
  after?: string | null
  /** Abort signal for the stream request. */
  signal?: AbortSignal
}

// ---------------------------------------------------------------------------
// Raw wire shapes (not in the OpenAPI spec — defined here)
// ---------------------------------------------------------------------------

interface RawEnvelope {
  citations?: {
    search_queries?: string[]
    citations?: Array<{ url: string; title?: string; snippet?: string; site_name?: string }>
  } | null
  clarification?: Schemas.ClarificationRequestedEvent | Schemas.ClarificationResolvedEvent | null
  delta?: unknown
  error?: { code?: string; message?: string; details?: unknown } | null
  finish_reason?: ChatFinishReason | null
  resource_updates?: {
    resources?: Array<{
      resource_type: 'note' | 'artifact'
      resource_id: string
      fields?: string[]
    }>
  } | null
  type: string
}

interface TraceDelta {
  agent_name: string
  parent_run_id: string | null
  payload?: {
    /**
     * Pydantic-AI run event kind. Text/thinking arrive as `part_start` +
     * `part_delta`; tool activity arrives as the dedicated tool event kinds
     * (`function_tool_call`/`output_tool_call` for calls,
     * `function_tool_result`/`output_tool_result` for returns), each carrying
     * the part on `payload.part` — NOT as a `part_start` with
     * `part_kind: 'tool-call'`.
     */
    event_kind: string
    part?: {
      part_kind?: string
      content?: unknown
      tool_name?: string
      tool_call_id?: string
      args?: unknown
    }
    delta?: { part_delta_kind: string; content_delta?: string }
  }
  root_run_id: string
  run_id: string
}

/** Build a `tool-call` event from a trace part, or null if there's no part. */
function toolCallEvent(
  part: NonNullable<TraceDelta['payload']>['part'],
  run: AgentRun
): ChatEvent | null {
  return part
    ? {
        type: 'tool-call',
        toolName: part.tool_name ?? '',
        toolCallId: part.tool_call_id ?? '',
        args: part.args,
        run,
      }
    : null
}

/** Build a `tool-return` event from a trace part, or null if there's no part. */
function toolReturnEvent(
  part: NonNullable<TraceDelta['payload']>['part'],
  run: AgentRun
): ChatEvent | null {
  return part
    ? {
        type: 'tool-return',
        toolName: part.tool_name ?? '',
        toolCallId: part.tool_call_id ?? '',
        content: part.content,
        run,
      }
    : null
}

/** Tracks the main run (first run with no parent) across a single stream. */
class RunTracker {
  private mainRunId: string | null = null

  run(d: TraceDelta): AgentRun {
    if (this.mainRunId === null && d.parent_run_id === null) this.mainRunId = d.run_id
    return {
      runId: d.run_id,
      agentName: d.agent_name,
      parentRunId: d.parent_run_id,
      rootRunId: d.root_run_id,
      isMain: d.run_id === this.mainRunId,
    }
  }
}

function mapTrace(d: TraceDelta, tracker: RunTracker): ChatEvent | null {
  if (!d || typeof d !== 'object') return null
  const run = tracker.run(d)
  const p = d.payload
  if (!p) return null
  const part = p.part
  const text = (v: unknown): string => (typeof v === 'string' ? v : '')
  switch (p.event_kind) {
    // Streamed text/thinking — a part snapshot then incremental deltas.
    case 'part_start': {
      if (!part) return null
      switch (part.part_kind) {
        case 'text':
          return text(part.content) ? { type: 'text', text: text(part.content), run } : null
        case 'thinking':
          return text(part.content) ? { type: 'thinking', text: text(part.content), run } : null
        // A tool-call/return can also surface as a part_start; handle for safety.
        case 'tool-call':
          return toolCallEvent(part, run)
        case 'tool-return':
          return toolReturnEvent(part, run)
        default:
          return null
      }
    }
    case 'part_delta': {
      if (!p.delta) return null
      const { part_delta_kind, content_delta } = p.delta
      if (part_delta_kind === 'text')
        return content_delta ? { type: 'text', text: content_delta, run } : null
      if (part_delta_kind === 'thinking')
        return content_delta ? { type: 'thinking', text: content_delta, run } : null
      return null
    }
    // Tool activity arrives under dedicated event kinds (not part_start). These
    // are the kinds the live Ancher stream actually emits, so mapping them here
    // is what makes the activity tree + query-invalidation work downstream.
    case 'function_tool_call':
    case 'output_tool_call':
      return toolCallEvent(part, run)
    case 'function_tool_result':
    case 'output_tool_result':
      return toolReturnEvent(part, run)
    default:
      return null
  }
}

function mapEnvelope(env: RawEnvelope, tracker: RunTracker): ChatEvent | null {
  switch (env.type) {
    case 'content':
      return typeof env.delta === 'string' ? { type: 'text', text: env.delta, run: null } : null
    case 'narration':
      return typeof env.delta === 'string' ? { type: 'narration', text: env.delta } : null
    case 'review_rejected':
      return typeof env.delta === 'string' ? { type: 'review-rejected', text: env.delta } : null
    case 'citations': {
      const c = env.citations
      return {
        type: 'citations',
        searchQueries: c?.search_queries ?? [],
        citations: (c?.citations ?? []).map(x => ({
          url: x.url,
          title: x.title ?? '',
          snippet: x.snippet ?? '',
          siteName: x.site_name ?? '',
        })),
      }
    }
    case 'resource_updated':
      return {
        type: 'resource-updated',
        resources: (env.resource_updates?.resources ?? []).map(x => ({
          resourceType: x.resource_type,
          resourceId: x.resource_id,
          fields: x.fields ?? [],
        })),
      }
    case 'clarification_requested':
      return env.clarification
        ? {
            type: 'clarification-requested',
            clarification: env.clarification as Schemas.ClarificationRequestedEvent,
          }
        : null
    case 'clarification_resolved':
      return env.clarification
        ? {
            type: 'clarification-resolved',
            clarification: env.clarification as Schemas.ClarificationResolvedEvent,
          }
        : null
    case 'done':
      return { type: 'done', finishReason: env.finish_reason ?? 'stop' }
    case 'error':
      return {
        type: 'error',
        code: env.error?.code,
        message: env.error?.message ?? 'Chat stream error',
        details: env.error?.details,
      }
    case 'trace':
      return mapTrace(env.delta as TraceDelta, tracker)
    default:
      return null
  }
}

// ---------------------------------------------------------------------------
// SSE parsing + transport
// ---------------------------------------------------------------------------

/** Parse an SSE `Response` body into a stream of structured {@link ChatEvent}s. */
export async function* parseChatStream(response: Response): AsyncGenerator<ChatEvent> {
  const body = response.body
  if (!body) return
  const reader = body.getReader()
  const decoder = new TextDecoder()
  const tracker = new RunTracker()
  let buffer = ''
  let data: string[] = []

  /** Returns the mapped event for the buffered frame, or an `end` signal. */
  const dispatch = (): { event?: ChatEvent | null; end?: boolean } => {
    if (data.length === 0) return {}
    const payload = data.join('\n')
    data = []
    if (payload === '[DONE]') return { end: true }
    let env: RawEnvelope
    try {
      env = JSON.parse(payload) as RawEnvelope
    } catch {
      return {}
    }
    if (!env || typeof env.type !== 'string') return {} // skips `{}` pings
    return { event: mapEnvelope(env, tracker) }
  }

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      let idx: number
      while ((idx = buffer.indexOf('\n')) !== -1) {
        let line = buffer.slice(0, idx)
        buffer = buffer.slice(idx + 1)
        if (line.endsWith('\r')) line = line.slice(0, -1)
        if (line === '') {
          const { event, end } = dispatch()
          if (event) yield event
          if (end || event?.type === 'done' || event?.type === 'error') return
          continue
        }
        if (line.startsWith(':')) continue // comment
        if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''))
        // `event:` / `id:` lines are ignored — the discriminator is in the JSON.
      }
    }
    const { event } = dispatch()
    if (event) yield event
  } finally {
    // Cancel (not just releaseLock) so an early break/return by the consumer
    // tears down the underlying stream + HTTP connection instead of leaking it.
    await reader.cancel().catch(() => {})
  }
}

async function streamHeaders(
  config: AncherClientConfig,
  traceId: string
): Promise<Record<string, string>> {
  return {
    Accept: 'text/event-stream',
    ...config.defaultHeaders,
    ...(await buildContextHeaders(config, traceId)),
  }
}

/** Open an SSE stream at `url` (auth + 401-refresh-retry), throwing `AncherApiError` on non-2xx. */
async function openStreamUrl(
  client: AncherClient,
  url: string,
  opts: ChatStreamOptions
): Promise<Response> {
  const config = client.config
  const doFetch = config.fetch ?? globalThis.fetch
  const credentials = config.credentials ?? 'include'
  // Held outside `send` so the 401 replay stays in the same trace.
  const traceId = newTraceId()
  const send = async () =>
    doFetch(url, {
      method: 'GET',
      headers: await streamHeaders(config, traceId),
      credentials,
      signal: opts.signal,
    })

  const response = await sendWithSessionRefresh(config, send, opts.signal)
  if (!response.ok) {
    const error = await buildApiError(response)
    config.onError?.(error)
    throw error
  }
  return response
}

/** Build the canonical conversation stream URL (origin + `/api/v1/...` + optional `after` cursor). */
function conversationStreamUrl(
  config: AncherClientConfig,
  conversationId: string,
  after?: string | null
): string {
  const base = `${config.baseUrl}/api/v1/conversations/${conversationId}/stream`
  return after ? `${base}?after=${encodeURIComponent(after)}` : base
}

/** Resolve a possibly-relative stream URL against the configured `baseUrl`. */
function resolveStreamUrl(config: AncherClientConfig, streamUrl: string): string {
  if (/^https?:\/\//.test(streamUrl)) return streamUrl
  const path = streamUrl.startsWith('/') ? streamUrl : `/${streamUrl}`
  // Bare API paths (e.g. a resumed `/conversations/{id}/stream`) need the
  // `/api/v1` prefix; receipt `stream_url`s that already carry it are left as-is.
  const normalized = path.startsWith('/api/') ? path : `/api/v1${path}`
  return `${config.baseUrl}${normalized}`
}

/**
 * Open a conversation SSE stream and return the **raw `Response`** with the SDK's
 * auth applied (CSRF/device/timezone/bearer) and a single 401→refresh→retry —
 * for consumers that parse the byte stream themselves (e.g. an app that maps the
 * envelopes into its own reducer) instead of using {@link streamConversation}'s
 * typed {@link ChatEvent}s. A relative `streamUrl` is resolved against `baseUrl`.
 * Does **not** throw on a non-2xx response — inspect `response.ok`.
 */
export async function openConversationStream(
  client: AncherClient,
  streamUrl: string,
  opts: ChatStreamOptions = {}
): Promise<Response> {
  const config = client.config
  const doFetch = config.fetch ?? globalThis.fetch
  const credentials = config.credentials ?? 'include'
  const url = resolveStreamUrl(config, streamUrl)
  // Held outside `send` so the 401 replay stays in the same trace.
  const traceId = newTraceId()
  const send = async () =>
    doFetch(url, {
      method: 'GET',
      headers: await streamHeaders(config, traceId),
      credentials,
      signal: opts.signal,
    })
  return sendWithSessionRefresh(config, send, opts.signal)
}

/**
 * Tail a conversation's SSE stream by id as structured {@link ChatEvent}s. Use
 * this for resume (omit `after` to replay from the start).
 */
export async function* streamConversation(
  client: AncherClient,
  conversationId: string,
  opts: ChatStreamOptions = {}
): AsyncGenerator<ChatEvent> {
  yield* parseChatStream(
    await openStreamUrl(client, conversationStreamUrl(client.config, conversationId, opts.after), opts)
  )
}

/**
 * Tail an SSE stream at an explicit URL (e.g. the `stream_url` from a
 * {@link Schemas.ConversationRunReceipt}) as structured {@link ChatEvent}s.
 * A relative URL is resolved against the configured `baseUrl`.
 */
export async function* streamConversationUrl(
  client: AncherClient,
  streamUrl: string,
  opts: ChatStreamOptions = {}
): AsyncGenerator<ChatEvent> {
  yield* parseChatStream(await openStreamUrl(client, resolveStreamUrl(client.config, streamUrl), opts))
}

// ---------------------------------------------------------------------------
// Callback convenience
// ---------------------------------------------------------------------------

export interface ChatHandlers {
  onCitations?(citations: ChatCitation[], searchQueries: string[]): void
  onClarificationRequested?(clarification: Schemas.ClarificationRequestedEvent): void
  onClarificationResolved?(clarification: Schemas.ClarificationResolvedEvent): void
  onDone?(finishReason: ChatFinishReason): void
  onError?(error: { code?: string; message: string; details?: unknown }): void
  /** Every event, before the typed handlers below. */
  onEvent?(event: ChatEvent): void
  onNarration?(text: string): void
  onResourceUpdated?(resources: ChatResourceUpdate[]): void
  onReviewRejected?(text: string): void
  onText?(text: string, run: AgentRun | null): void
  onThinking?(text: string, run: AgentRun): void
  onToolCall?(call: { toolName: string; toolCallId: string; args: unknown }, run: AgentRun): void
  onToolReturn?(
    ret: { toolName: string; toolCallId: string; content: unknown },
    run: AgentRun
  ): void
}

export interface ChatResult {
  /** The terminal finish reason, if the stream ended cleanly. */
  finishReason: ChatFinishReason | null
  /** Accumulated main-agent assistant text. */
  text: string
}

/**
 * Drive a {@link ChatEvent} stream with callbacks, accumulating the main-agent
 * text. Resolves when the stream ends.
 */
export async function consumeChat(
  stream: AsyncIterable<ChatEvent>,
  handlers: ChatHandlers = {}
): Promise<ChatResult> {
  let text = ''
  let finishReason: ChatFinishReason | null = null
  for await (const event of stream) {
    handlers.onEvent?.(event)
    switch (event.type) {
      case 'text':
        if (event.run === null || event.run.isMain) text += event.text
        handlers.onText?.(event.text, event.run)
        break
      case 'thinking':
        handlers.onThinking?.(event.text, event.run)
        break
      case 'tool-call':
        handlers.onToolCall?.(
          { toolName: event.toolName, toolCallId: event.toolCallId, args: event.args },
          event.run
        )
        break
      case 'tool-return':
        handlers.onToolReturn?.(
          { toolName: event.toolName, toolCallId: event.toolCallId, content: event.content },
          event.run
        )
        break
      case 'narration':
        handlers.onNarration?.(event.text)
        break
      case 'review-rejected':
        handlers.onReviewRejected?.(event.text)
        break
      case 'citations':
        handlers.onCitations?.(event.citations, event.searchQueries)
        break
      case 'resource-updated':
        handlers.onResourceUpdated?.(event.resources)
        break
      case 'clarification-requested':
        handlers.onClarificationRequested?.(event.clarification)
        break
      case 'clarification-resolved':
        handlers.onClarificationResolved?.(event.clarification)
        break
      case 'error':
        handlers.onError?.({ code: event.code, message: event.message, details: event.details })
        break
      case 'done':
        finishReason = event.finishReason
        handlers.onDone?.(event.finishReason)
        break
    }
  }
  return { text, finishReason }
}
