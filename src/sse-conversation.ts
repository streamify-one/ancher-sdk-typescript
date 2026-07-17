/**
 * Runtime-neutral SSE conversation parser + stream state machine.
 *
 * The streaming protocol delivers `ConversationStreamResponse` envelopes — each
 * carries a sanitized pydantic-ai delta plus agent-run metadata. This module
 * parses the envelopes, reduces them into an `SSEStreamState`, and fans the
 * delta parts out to the `SSEHandlers` callbacks. It operates purely on strings
 * and typed events from `@ancher-ai/sdk/contracts`, with zero coupling
 * to any runtime (no `fetch`, auth, DOM, or React) — each app supplies the
 * authenticated streaming `fetch` + `getReader()` loop itself and feeds decoded
 * text into `processSSEBuffer`.
 */

import type {
  AgentRunStreamTraceDelta,
  ClarificationRequestedPayload,
  ClarificationResolvedPayload,
  ConversationRunReceipt,
  DeltaTextPart,
  DeltaThinkingPart,
  DeltaToolCallPart,
  DeltaToolReturnPart,
  FinishReason,
  SSECitationsEvent,
  SSEEvent,
  SSEMessageEvent,
  SSEResourceUpdatedEvent,
  SSETraceEvent,
  SuggestedAction,
} from './contracts/conversation'

// ============================================================================
// Agent context + parsed payload shapes
// ============================================================================

/** Agent context attached to every per-part callback. */
export interface AgentRunContext {
  agentName: string
  agentRunId: string
  /**
   * True for events that belong to the main (user-visible) agent run.
   *
   * The envelope's `root_run_id` is the *tracker* (parent of main_agent), not
   * the main agent itself — `agent_run_id === root_run_id` is never true. We
   * instead lock onto the first `agent_run_id` we observe in a stream and
   * mark all of its events as the main run. Sub-agents (different
   * `agent_run_id`, with `parent_run_id` set to the main run) and post-turn
   * helpers such as `review_agent` (different `agent_run_id`, null
   * `parent_run_id`, *different* `root_run_id` tracker) are not the main run.
   */
  isMainAgent: boolean
  parentRunId: string | null
  /** Tracker run id from the envelope's `root_run_id` field. */
  rootRunId: string
}

/** Parsed tool-call payload surfaced via `onToolCall`. */
export interface AgentToolCall {
  args: DeltaToolCallPart['args']
  toolCallId: string
  toolName: string
}

/** Parsed tool-return payload surfaced via `onToolReturn`. */
export interface AgentToolReturn {
  content: unknown
  outcome?: string
  timestamp?: string
  toolCallId: string
  toolName: string
}

/** SSE event handler callbacks */
export interface SSEHandlers {
  /** An agent run produced a response with a `finish_reason` set. */
  onAgentRunEnd?: (ctx: AgentRunContext, finishReason: FinishReason | null) => void

  // ---- Convenience: per-part fan-out from message deltas ------------------

  /** A new agent run was observed (first event with this `agent_run_id`). */
  onAgentRunStart?: (ctx: AgentRunContext) => void
  /** Citations payload (web-search tool returns). */
  onCitations?: (event: SSECitationsEvent) => void
  /** Agent paused for user clarification. */
  onClarificationRequested?: (payload: ClarificationRequestedPayload) => void
  /** User responded to clarification, agent resuming. */
  onClarificationResolved?: (payload: ClarificationResolvedPayload) => void
  /** Called when the stream closes — success, error, or cancellation. */
  onClose?: () => void
  /**
   * A chunk of visible response text from a `content` envelope. The backend
   * streams the assistant's final answer separately from trace events, so this
   * is the channel UI consumers should accumulate into the streamed reply.
   */
  onContent?: (delta: string, accumulated: string) => void
  /** Called the first time we know the conversation id (from the first envelope). */
  onConversationId?: (conversationId: string) => void
  /** Terminal `done` envelope. */
  onDone?: (
    conversationId: string,
    messageId: string,
    finishReason: 'stop' | 'error' | 'clarification_requested'
  ) => void
  /** Terminal `error` envelope or any thrown stream error. */
  onError?: (error: string) => void
  /** Raw access to every `message` envelope. */
  onMessage?: (event: SSEMessageEvent) => void
  /** Called when the stream opens (after HTTP 200). */
  onOpen?: () => void
  /** Resource updates emitted after mutating agent tools run. */
  onResourceUpdated?: (event: SSEResourceUpdatedEvent) => void
  /** Called as soon as the POST endpoint returns the persisted run receipt. */
  onRunReceipt?: (receipt: ConversationRunReceipt) => void
  /** A `text` part on a response delta. */
  onText?: (part: DeltaTextPart, ctx: AgentRunContext) => void
  /** A `thinking` part on a response delta. */
  onThinking?: (part: DeltaThinkingPart, ctx: AgentRunContext) => void
  /** A `tool-call` part on a response delta. */
  onToolCall?: (call: AgentToolCall, ctx: AgentRunContext) => void
  /** A `tool-return` part on a request delta (tool result fed back into the run). */
  onToolReturn?: (ret: AgentToolReturn, ctx: AgentRunContext) => void
}

// ============================================================================
// Stream state
// ============================================================================

const NIL_UUID = '00000000-0000-0000-0000-000000000000'

/** Mutable state accumulated during SSE streaming */
export interface SSEStreamState {
  /** Accumulated user-visible content (main-agent text parts). */
  accumulatedText: string
  conversationId: string
  finishReason: 'stop' | 'error' | 'clarification_requested'
  /** Bookkeeping for the paragraph-break separator between responses. */
  lastTextResponseKey: string | null
  /**
   * The user-visible main agent's `agent_run_id` — locked from the first
   * envelope we see. NOT the same as the SSE envelope's `root_run_id`
   * field, which is a wrapping tracker (parent of main_agent). The server
   * never sets `agent_run_id === root_run_id`, so we cannot derive the main
   * agent from envelope fields alone — the first observed `agent_run_id` is
   * always main_agent's.
   */
  mainAgentRunId: string | null
  messageId: string
  /**
   * Number of `finish_reason`-bearing responses we've seen on the main agent
   * run. Forms part of `lastTextResponseKey` so text deltas in a single
   * response share one key while the next response gets a new key (triggering
   * the `\n\n` separator). Avoids the envelope's second-precision `created_at`,
   * which would falsely split a response that crosses a one-second boundary.
   */
  responseCount: number
  /** Tracks which agent run ids we've observed so we can synthesize start callbacks. */
  seenRunIds: Set<string>
  /** True once Redis produced any non-terminal conversation payload. */
  streamPayloadReceived: boolean
  /**
   * Suggested next-step actions carried on the terminal `done` envelope (empty
   * until then). Consumers rank/pick one (e.g. the highest-`confidence` prompt)
   * to offer as a composer hint after the turn completes.
   */
  suggestedActions?: SuggestedAction[]
  /** True once a terminal SSE envelope has been processed. */
  terminalReceived: boolean
}

export function createInitialStreamState(conversationId = '', messageId = ''): SSEStreamState {
  return {
    conversationId,
    messageId,
    finishReason: 'stop',
    seenRunIds: new Set(),
    mainAgentRunId: null,
    accumulatedText: '',
    lastTextResponseKey: null,
    responseCount: 0,
    streamPayloadReceived: false,
    terminalReceived: false,
  }
}

/** Update state ID only if the value is a valid (non-nil) UUID and hasn't been set yet (first chunk wins) */
function setIfValid(
  state: SSEStreamState,
  key: 'conversationId' | 'messageId',
  value: string | undefined | null
): void {
  if (value && value !== NIL_UUID && !state[key]) {
    state[key] = value
  }
}

// ============================================================================
// Envelope parsing
// ============================================================================

/** Parse a single SSE data payload into an `SSEEvent`. */
export function parseSSEEvent(data: string): SSEEvent | null {
  try {
    const parsed = JSON.parse(data) as SSEEvent
    // The server omits `created_at` on the new trace-envelope schema.
    // Downstream code uses it for timestamps, so synthesize one when
    // missing rather than letting `new Date(NaN)` poison the pipeline.
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof (parsed as { created_at?: unknown }).created_at !== 'number'
    ) {
      ;(parsed as { created_at: number }).created_at = Date.now() / 1000
    }
    return parsed
  } catch {
    return null
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object'
}

/** Parse the `delta` of a trace envelope into an `AgentRunStreamTraceDelta`. */
function parseTraceDelta(
  delta: AgentRunStreamTraceDelta | undefined | null
): AgentRunStreamTraceDelta | null {
  if (
    !isObject(delta) ||
    typeof delta.run_id !== 'string' ||
    typeof delta.root_run_id !== 'string' ||
    typeof delta.agent_name !== 'string' ||
    !isObject(delta.payload) ||
    typeof delta.payload.event_kind !== 'string'
  ) {
    return null
  }
  return delta as AgentRunStreamTraceDelta
}

type TraceDeltaPart = DeltaTextPart | DeltaThinkingPart | DeltaToolCallPart | DeltaToolReturnPart
type TracePayload = AgentRunStreamTraceDelta['payload']
type TracePayloadPart = NonNullable<TracePayload['part']>

function traceToolCallPart(
  trace: AgentRunStreamTraceDelta,
  part: TracePayloadPart
): DeltaToolCallPart | null {
  if (!part.tool_name) return null

  return {
    part_kind: 'tool-call',
    tool_name: part.tool_name,
    tool_call_id: part.tool_call_id ?? `${trace.run_id}:${part.tool_name}`,
    args: part.args ?? null,
  }
}

function traceToolReturnPart(
  trace: AgentRunStreamTraceDelta,
  part: TracePayloadPart
): DeltaToolReturnPart | null {
  if (!part.tool_name) return null

  return {
    part_kind: 'tool-return',
    tool_name: part.tool_name,
    tool_call_id: part.tool_call_id ?? `${trace.run_id}:${part.tool_name}`,
    content: part.content,
    outcome: part.outcome,
    timestamp: part.timestamp,
  }
}

function tracePartStartToDeltaPart(payload: TracePayload): TraceDeltaPart | null {
  const part = payload.part
  if (part?.part_kind === 'text' && part.content) {
    return { part_kind: 'text', content: part.content }
  }
  if (part?.part_kind === 'thinking' && part.content) {
    return { part_kind: 'thinking', content: part.content }
  }
  return null
}

function tracePartDeltaToDeltaPart(
  payload: TracePayload
): DeltaTextPart | DeltaThinkingPart | null {
  if (payload.delta?.part_delta_kind === 'text' && payload.delta.content_delta) {
    return { part_kind: 'text', content: payload.delta.content_delta }
  }
  if (payload.delta?.part_delta_kind === 'thinking' && payload.delta.content_delta) {
    return { part_kind: 'thinking', content: payload.delta.content_delta }
  }
  return null
}

function tracePayloadPartToDeltaPart(trace: AgentRunStreamTraceDelta): TraceDeltaPart | null {
  const { payload } = trace

  if (payload.event_kind === 'part_start') {
    return tracePartStartToDeltaPart(payload)
  }

  if (payload.event_kind === 'part_delta') {
    return tracePartDeltaToDeltaPart(payload)
  }

  if (
    (payload.event_kind === 'function_tool_call' || payload.event_kind === 'output_tool_call') &&
    payload.part
  ) {
    return traceToolCallPart(trace, payload.part)
  }

  if (
    (payload.event_kind === 'function_tool_result' ||
      payload.event_kind === 'output_tool_result') &&
    payload.part
  ) {
    return traceToolReturnPart(trace, payload.part)
  }

  return null
}

export function traceEventToMessageEvents(event: SSETraceEvent): SSEMessageEvent[] {
  const trace = parseTraceDelta(event.delta)
  if (!trace) return []

  const part = tracePayloadPartToDeltaPart(trace)
  if (!part) return []
  const createdAt = event.created_at ?? Date.now() / 1000
  const timestamp =
    trace.payload.event_kind === 'part_start' || trace.payload.event_kind === 'part_delta'
      ? `${trace.run_id}:part:${trace.payload.index ?? 0}`
      : new Date(createdAt * 1000).toISOString()

  // The new trace schema never carries a top-level `finish_reason` on
  // response deltas, so the reducer has nothing to key the paragraph break
  // off of when the same agent_run emits text → tool-call → text. The
  // `function_tool_call` event marks the LLM response as ending with a
  // tool call, so synthesize `finish_reason: 'tool_call'` here — the
  // reducer's response counter then bumps and the next text from this run
  // gets the `\n\n` separator before it.
  const finishReason: FinishReason | undefined =
    part.part_kind !== 'tool-return' && trace.payload.event_kind === 'function_tool_call'
      ? 'tool_call'
      : undefined

  return [
    {
      type: 'message',
      conversation_id: event.conversation_id,
      message_id: event.message_id,
      agent_run_id: trace.run_id,
      parent_run_id: trace.parent_run_id ?? null,
      root_run_id: trace.root_run_id,
      agent_name: trace.agent_name,
      created_at: createdAt,
      delta:
        part.part_kind === 'tool-return'
          ? {
              kind: 'request',
              parts: [part],
              run_id: trace.run_id,
              timestamp,
            }
          : {
              kind: 'response',
              parts: [part],
              run_id: trace.run_id,
              timestamp,
              finish_reason: finishReason,
            },
    },
  ]
}

// ============================================================================
// Dispatch + reduction
// ============================================================================

function buildAgentContext(
  event: SSEMessageEvent,
  mainAgentRunId: string | null
): AgentRunContext | null {
  if (!(event.agent_run_id && event.root_run_id)) return null
  return {
    agentRunId: event.agent_run_id,
    parentRunId: event.parent_run_id ?? null,
    rootRunId: event.root_run_id,
    agentName: event.agent_name ?? '',
    isMainAgent: event.agent_run_id === mainAgentRunId,
  }
}

function isRepeatedFullTextEnvelope(currentText: string, nextText: string): boolean {
  const current = currentText.trim()
  const next = nextText.trim()
  return current.length > 0 && current === next
}

export function appendVisibleTextPart(
  state: SSEStreamState,
  responseKey: string,
  content: string
): void {
  if (isRepeatedFullTextEnvelope(state.accumulatedText, content)) return

  const separator = state.accumulatedText && state.lastTextResponseKey !== responseKey ? '\n\n' : ''
  state.accumulatedText += separator + content
  state.lastTextResponseKey = responseKey
}

/** Fan a `message` envelope's parts out to the convenience callbacks. */
function dispatchMessageParts(
  event: SSEMessageEvent,
  state: SSEStreamState,
  handlers: SSEHandlers
): void {
  // The first agent_run_id we see in a stream is the user-visible turn (the
  // server starts every turn with main_agent). Sub-agents and the post-turn
  // review_agent get different ids; we keep their tool calls hidden from
  // accumulatedText.
  if (state.mainAgentRunId === null && event.agent_run_id && event.parent_run_id === null) {
    state.mainAgentRunId = event.agent_run_id
  }

  const ctx = buildAgentContext(event, state.mainAgentRunId)
  if (!ctx) return

  if (!state.seenRunIds.has(ctx.agentRunId)) {
    state.seenRunIds.add(ctx.agentRunId)
    handlers.onAgentRunStart?.(ctx)
  }

  const isVisibleRun = ctx.isMainAgent
  // Key responses by run id + a per-run response counter so all text deltas
  // in the same response share one key. Bumping on `finish_reason` (below)
  // gives the next response a different key and triggers the `\n\n` separator.
  const responseKey = `${ctx.agentRunId}:${state.responseCount}`

  for (const part of event.delta.parts) {
    switch (part.part_kind) {
      case 'text':
        if (isVisibleRun && part.content) {
          appendVisibleTextPart(state, responseKey, part.content)
        }
        handlers.onText?.(part, ctx)
        break
      case 'thinking':
        handlers.onThinking?.(part, ctx)
        break
      case 'tool-call':
        handlers.onToolCall?.(
          {
            toolName: part.tool_name,
            toolCallId: part.tool_call_id,
            args: part.args,
          },
          ctx
        )
        break
      case 'tool-return':
        handlers.onToolReturn?.(
          {
            toolName: part.tool_name,
            toolCallId: part.tool_call_id,
            content: part.content,
            outcome: part.outcome,
            timestamp: part.timestamp,
          },
          ctx
        )
        break
      default:
        break
    }
  }

  if (event.delta.kind === 'response' && event.delta.finish_reason) {
    if (isVisibleRun) state.responseCount += 1
    handlers.onAgentRunEnd?.(ctx, event.delta.finish_reason)
  }
}

/**
 * Dispatch a parsed SSE event to the appropriate handler
 * and update the accumulated stream state.
 */
export function dispatchSSEEvent(
  event: SSEEvent,
  state: SSEStreamState,
  handlers: SSEHandlers
): void {
  const prevConvId = state.conversationId

  switch (event.type) {
    case 'message': {
      state.streamPayloadReceived = true
      setIfValid(state, 'conversationId', event.conversation_id)
      setIfValid(state, 'messageId', event.message_id)
      handlers.onMessage?.(event)
      dispatchMessageParts(event, state, handlers)
      break
    }
    case 'trace': {
      state.streamPayloadReceived = true
      setIfValid(state, 'conversationId', event.conversation_id)
      setIfValid(state, 'messageId', event.message_id)
      // `traceEventToMessageEvents` returns at most one synthesized
      // `message` envelope (call OR return, depending on `event_kind`)
      // — and zero when the trace carries no renderable part. Iterate
      // so the empty case is a no-op without an extra guard.
      for (const messageEvent of traceEventToMessageEvents(event)) {
        handlers.onMessage?.(messageEvent)
        dispatchMessageParts(messageEvent, state, handlers)
      }
      break
    }
    case 'content': {
      state.streamPayloadReceived = true
      setIfValid(state, 'conversationId', event.conversation_id)
      setIfValid(state, 'messageId', event.message_id)
      if (event.delta) {
        state.accumulatedText += event.delta
        handlers.onContent?.(event.delta, state.accumulatedText)
      }
      break
    }
    case 'citations': {
      state.streamPayloadReceived = true
      setIfValid(state, 'conversationId', event.conversation_id)
      setIfValid(state, 'messageId', event.message_id)
      handlers.onCitations?.(event)
      break
    }
    case 'resource_updated': {
      state.streamPayloadReceived = true
      setIfValid(state, 'conversationId', event.conversation_id)
      setIfValid(state, 'messageId', event.message_id)
      handlers.onResourceUpdated?.(event)
      break
    }
    case 'clarification_requested': {
      state.streamPayloadReceived = true
      setIfValid(state, 'conversationId', event.conversation_id)
      setIfValid(state, 'messageId', event.message_id)
      handlers.onClarificationRequested?.(event.clarification)
      break
    }
    case 'clarification_resolved': {
      state.streamPayloadReceived = true
      setIfValid(state, 'conversationId', event.conversation_id)
      setIfValid(state, 'messageId', event.message_id)
      handlers.onClarificationResolved?.(event.clarification)
      break
    }
    case 'done': {
      setIfValid(state, 'conversationId', event.conversation_id)
      setIfValid(state, 'messageId', event.message_id)
      state.finishReason = event.finish_reason
      state.suggestedActions = event.suggested_actions ?? undefined
      state.terminalReceived = true
      handlers.onDone?.(state.conversationId, state.messageId, event.finish_reason)
      break
    }
    case 'error': {
      setIfValid(state, 'conversationId', event.conversation_id)
      setIfValid(state, 'messageId', event.message_id)
      const errorMessage = event.error?.message ?? 'Something went wrong. Please try again.'
      state.finishReason = 'error'
      state.terminalReceived = true
      handlers.onError?.(errorMessage)
      throw new Error(errorMessage)
    }
    default:
      break
  }

  if (!prevConvId && state.conversationId) {
    handlers.onConversationId?.(state.conversationId)
  }
}

/**
 * Process a buffer of SSE data, parsing complete lines and dispatching events.
 * Returns the remaining incomplete buffer.
 */
export function processSSEBuffer(
  buffer: string,
  state: SSEStreamState,
  handlers: SSEHandlers
): string {
  const lines = buffer.split('\n')
  const remaining = lines.pop() ?? ''

  for (const line of lines) {
    const trimmed = line.trim()

    // Skip empty lines, comments, ping frames, event-name lines, and the SSE terminator.
    // NOTE: SSE `id:` cursor lines are intentionally discarded here.
    // The server drives idempotent single-slot replay, so we do not track the
    // cursor client-side — do not add `id:` handling without revisiting resume
    // semantics.
    if (
      !trimmed ||
      trimmed.startsWith(':') ||
      trimmed.startsWith('event: ') ||
      trimmed === 'data: [DONE]' ||
      trimmed === 'data: {}'
    ) {
      continue
    }

    if (trimmed.startsWith('data: ')) {
      const data = trimmed.slice(6)
      const event = parseSSEEvent(data)
      if (event) {
        dispatchSSEEvent(event, state, handlers)
      }
    }
  }

  return remaining
}
