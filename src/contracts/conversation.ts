/**
 * Conversation (AI Chat) types: entities, enums, and typed list options for
 * the conversation + message endpoints.
 */

import type { Eq, Expect } from './assert'
import type { GetEndpointQuery, Page, UnixTimestamp, UUID } from './common'
import type {
  BranchOf,
  ListOptions,
  NoOperatorCollision,
  OrderByOf,
  Where,
} from './query'
import type { Schemas } from './schemas'

/* ---------------------------------------------------------------------------
 * Enums.
 * ------------------------------------------------------------------------- */

/** Chat message sender role. */
export const MessageRole = {
  User: 'user',
  Assistant: 'assistant',
} as const satisfies Record<string, Schemas.Message['role']>
export type MessageRole = (typeof MessageRole)[keyof typeof MessageRole]
/** @internal */
export type _MessageRoleExhaustive = Expect<Eq<MessageRole, Schemas.Message['role']>>

/** Status of an async conversation run (POST chat endpoints return 202 + receipt). */
export const ConversationRunStatus = {
  Running: 'running',
  Finished: 'finished',
  Cancelled: 'cancelled',
} as const satisfies Record<string, Schemas.ConversationRunReceipt['status']>
export type ConversationRunStatus = (typeof ConversationRunStatus)[keyof typeof ConversationRunStatus]
/** @internal */
export type _ConversationRunStatusExhaustive = Expect<
  Eq<ConversationRunStatus, Schemas.ConversationRunReceipt['status']>
>

/** User action submitted in response to a clarification request. */
export const ClarificationAction = {
  Answer: 'answer',
  Skip: 'skip',
  Cancel: 'cancel',
} as const satisfies Record<string, Schemas.ClarificationSubmitPayload['action']>
export type ClarificationAction = (typeof ClarificationAction)[keyof typeof ClarificationAction]
/** @internal */
export type _ClarificationActionExhaustive = Expect<
  Eq<ClarificationAction, Schemas.ClarificationSubmitPayload['action']>
>

/** Terminal status of a resolved clarification request. */
export const ClarificationResolutionStatus = {
  Answered: 'answered',
  Skipped: 'skipped',
  Cancelled: 'cancelled',
} as const satisfies Record<string, Schemas.ClarificationResolvedEvent['status']>
export type ClarificationResolutionStatus =
  (typeof ClarificationResolutionStatus)[keyof typeof ClarificationResolutionStatus]
/** @internal */
export type _ClarificationResolutionStatusExhaustive = Expect<
  Eq<ClarificationResolutionStatus, Schemas.ClarificationResolvedEvent['status']>
>

/**
 * FE-side clarification lifecycle status: the wire resolution statuses plus
 * `'pending'` (a requested-but-unresolved clarification — the wire never
 * carries `'pending'` as a status value).
 */
export type ClarificationStatus = 'pending' | ClarificationResolutionStatus

/**
 * Kind of inline content the user selected for the conversation context.
 * Checked against both generated unions (the chat-request attachment and the
 * persisted message record) so a backend divergence forces an explicit split
 * here.
 */
export const SelectedContentType = {
  Text: 'text',
  Image: 'image',
} as const satisfies Record<string, Schemas.SelectedContentAttachment['content_type']>
export type SelectedContentType = (typeof SelectedContentType)[keyof typeof SelectedContentType]
/** @internal */
export type _SelectedContentAttachmentExhaustive = Expect<
  Eq<SelectedContentType, Schemas.SelectedContentAttachment['content_type']>
>
/** @internal */
export type _SelectedContentMessageExhaustive = Expect<
  Eq<SelectedContentType, Schemas.MessageSelectedContent['content_type']>
>

/** Type of a DB-entity resource attached to a chat request. */
export const ResourceAttachmentType = {
  File: 'file',
  Note: 'note',
  Tag: 'tag',
  Collection: 'collection',
  Artifact: 'artifact',
} as const satisfies Record<string, Schemas.ResourceAttachment['type']>
export type ResourceAttachmentType =
  (typeof ResourceAttachmentType)[keyof typeof ResourceAttachmentType]
/** @internal */
export type _ResourceAttachmentTypeExhaustive = Expect<
  Eq<ResourceAttachmentType, Schemas.ResourceAttachment['type']>
>

/**
 * Discriminator value identifying the page-context attachment inside
 * {@link ChatRequestAttachment}.
 *
 * Not guarded with `satisfies`: the OpenAPI spec pins these discriminators as
 * single-value `const`s, but `typed-openapi` widens a one-value `const` to
 * `string`, so a `satisfies Record<string, Schemas.WebPageAttachment['type']>`
 * check would be vacuous. The union-membership guards below are what actually
 * fail on a codegen drift.
 */
export const WEB_PAGE_ATTACHMENT_TYPE = 'web_page'

/** Discriminator values for {@link SelectionSource}. See the note above re: `satisfies`. */
export const SelectionSourceType = {
  Note: 'note',
  Web: 'web',
} as const
export type SelectionSourceType = (typeof SelectionSourceType)[keyof typeof SelectionSourceType]

/* ---------------------------------------------------------------------------
 * Entities + clarification payloads.
 * ------------------------------------------------------------------------- */

/** Junction record linking a message to a file */
export type FileReference = Schemas.FileReference

/** User response item for a clarification request. */
export interface ClarificationSubmitItem {
  question_id: string
  value: string | string[]
}

export interface ClarificationSubmitPayload {
  action: ClarificationAction
  answers?: ClarificationSubmitItem[]
  note?: string | null
  request_id: UUID
}

export type ClarificationMessagePayload =
  | ClarificationRequestedPayload
  | ClarificationResolvedPayload

/**
 * A suggested next-step action produced after the main agent completes. The
 * `description` summarizes the action, while `prompt` is an editable draft a
 * client can offer in its composer rather than sending immediately. Clients can
 * use `confidence` to rank multiple actions; it remains optional because the
 * backend may omit it.
 *
 * Hand-defined overlay: the generated `Schemas.Message` does not yet carry
 * `suggested_actions` (the backend field is not deployed to the spec endpoint).
 * Remove this and derive from `Schemas` once a codegen refresh picks it up.
 */
export interface SuggestedAction {
  description: string
  prompt: string
  confidence?: number
}

/**
 * Chat message. The backend's `clarification` / `clarification_request_id`
 * are overridden with the FE clarification payload types (which carry extra
 * client-side UI metadata the clarification feature relies on). `suggested_actions`
 * is overlaid until the generated schema includes it (see {@link SuggestedAction}).
 */
export type Message = Omit<Schemas.Message, 'clarification' | 'clarification_request_id'> & {
  clarification?: ClarificationMessagePayload | null
  clarification_request_id?: UUID | null
  suggested_actions?: SuggestedAction[] | null
}

/** Tag attached to a message */
export type MessageTag = Schemas.MessageTag

/**
 * Recency + audit fields the current codegen does not carry.
 *
 * `last_interacted_at` arrives with api#117, which also bumps it on every
 * user/assistant message and deletes `Schemas.ConversationSchema` in favour of
 * the fuller `Schemas.Conversation`. The audit timestamps are overlaid for the
 * same reason: `GET /conversations` already returns `Schemas.Conversation`
 * (which carries them), but the alias below still points at the narrower shape.
 * Everything here is optional because `pnpm generate` cannot yet reach an
 * api#117 backend — **delete this overlay and repoint `Conversation` at
 * `Schemas.Conversation` once it can.**
 *
 * `last_interacted_at` accepts a number *or* a string deliberately.
 * `BaseDataSchema` sets `ser_json_temporal='seconds'`, so the wire value is
 * Unix seconds — but unlike `AuditMixin`'s fields it carries no
 * `{type: 'number', format: 'unix-timestamp'}` schema override, so the spec
 * declares it a date-time string. Consumers must handle both.
 */
interface ConversationRecencyFields {
  /** Unix seconds. */
  created_at?: number
  /** Unix seconds, or an ISO 8601 string — see the note above. */
  last_interacted_at?: number | string | null
  /** Unix seconds. */
  updated_at?: number
}

/** Conversation entity */
export type Conversation = Schemas.ConversationSchema & ConversationRecencyFields

/** Conversation with last message preview */
export interface ConversationWithPreview
  extends Schemas.ConversationSchema,
    ConversationRecencyFields {
  last_message?: Schemas.Message | null
  last_message_at?: string | null
  message_count?: number
}

/**
 * Chat request (start or continue conversation). `clarification` now comes
 * from the schema; `pro_mode` is an FE-only flag not in the OpenAPI schema.
 */
export type ChatRequest = Schemas.ChatRequestSchema & {
  pro_mode?: boolean
}

/** A single `ChatRequest.attachments` entry — resource ref, selection, or page. */
export type ChatRequestAttachment = NonNullable<Schemas.ChatRequestSchema['attachments']>[number]

/**
 * The web page the user is currently viewing, attached independently of any
 * selection. `content` is markdown extracted **client-side** — the server
 * inlines it into the model prompt at most once per content hash per
 * conversation and never persists it (only a SHA-256 `content_hash`, echoed on
 * {@link MessageWebPage}).
 */
export type WebPageAttachment = Schemas.WebPageAttachment

/** Provenance of a {@link Schemas.SelectedContentAttachment} — a note or a web page. */
export type SelectionSource = NonNullable<Schemas.SelectedContentAttachment['source']>

/** Selection provenance: the note the content was selected from. */
export type NoteSelectionSource = Schemas.NoteSelectionSource

/** Selection provenance: the web page the content was selected from. */
export type WebSelectionSource = Schemas.WebSelectionSource

/** Persisted page context echoed back on a message, for history re-render. */
export type MessageWebPage = Schemas.MessageWebPage

/** Persisted selected-content record echoed back on a message. */
export type MessageSelectedContent = Schemas.MessageSelectedContent

/**
 * Drift guards for the page-context contract (VITA-1057). These carry the
 * weight a `satisfies` check can't here: if a codegen refresh drops
 * `WebPageAttachment` from the attachments union, or either variant from the
 * selection-source union, these stop compiling.
 */
/** @internal */
export type _WebPageAttachmentInChatRequest = Expect<
  Schemas.WebPageAttachment extends ChatRequestAttachment ? true : false
>
/** @internal */
export type _NoteSelectionSourceInUnion = Expect<
  Schemas.NoteSelectionSource extends SelectionSource ? true : false
>
/** @internal */
export type _WebSelectionSourceInUnion = Expect<
  Schemas.WebSelectionSource extends SelectionSource ? true : false
>

/** Receipt returned after a chat run is accepted and moved to the backend stream. */
export interface ConversationRunReceipt {
  conversation_id: UUID
  message_id: UUID
  run_id: UUID
  status: ConversationRunStatus
  stream_url: string
  user_message_id: UUID
}

/** Note reference in a message (cited by AI) */
export type MessageNoteReference = Schemas.MessageNote

/** Update conversation request */
export type ConversationUpdateRequest = Schemas.ConversationUpdateRequest

/**
 * Update message request — partial body for `PATCH /messages/{id}`.
 *
 * Send `reaction: 'like' | 'dislike'` to set a reaction, `'neutral'` to
 * clear it, or omit / send `null` to leave it unchanged.
 */
export type MessageUpdate = Schemas.MessageUpdateRequest

/* ---------------------------------------------------------------------------
 * Conversation list surface.
 * ------------------------------------------------------------------------- */

/** Conversation list response (cursor-based) */
export type ConversationListResponse = Page<Conversation>

type ConversationListEndpointQuery = GetEndpointQuery<'/api/v1/conversations'>

/** Typed filter for conversation lists. */
export type ConversationWhere = Where<BranchOf<ConversationListEndpointQuery>>

/**
 * Signed sort keys for conversation lists.
 *
 * `last_interacted_at` arrives with api#117 but is absent from the current
 * generated query type. Remove this overlay after regenerating against that
 * backend, alongside `ConversationRecencyFields` above.
 */
export type ConversationOrderBy =
  | OrderByOf<ConversationListEndpointQuery>
  | '+last_interacted_at'
  | '-last_interacted_at'

/** Options for `sdk.Conversation.list` / `count` / `iterate`. */
export type ConversationListOptions = ListOptions<ConversationWhere, ConversationOrderBy>

/** @internal */
export type _ConversationNoOpCollision = Expect<
  NoOperatorCollision<BranchOf<ConversationListEndpointQuery>>
>

/* ---------------------------------------------------------------------------
 * Message list surface (messages are a conversation sub-resource).
 * ------------------------------------------------------------------------- */

/** Message list response (cursor-based) */
export type MessageListResponse = Page<Message>

type MessageListEndpointQuery =
  GetEndpointQuery<'/api/v1/conversations/{conversation_id}/messages'>

/** Typed filter for a conversation's message list. */
export type MessageWhere = Where<BranchOf<MessageListEndpointQuery>>

/** Signed sort keys for message lists (e.g. `'+created_at'`). */
export type MessageOrderBy = OrderByOf<MessageListEndpointQuery>

/** Options for `sdk.Message.list(conversationId, options)`. */
export type MessageListOptions = ListOptions<MessageWhere, MessageOrderBy>

/** @internal */
export type _MessageNoOpCollision = Expect<NoOperatorCollision<BranchOf<MessageListEndpointQuery>>>

// ============================================================================
// Streaming SSE schema
// ----------------------------------------------------------------------------
// The server emits a sanitized collectionion of pydantic-ai messages. Each event
// envelope carries `delta` — a `ConversationModelMessage` — alongside agent
// run metadata (run id hierarchy, agent name). Internal model/provider fields
// (model_name, provider_*, usage, etc.) and prompt parts (system/user) are
// stripped server-side, so they never appear here.
// ============================================================================

/** Reasons a single response message terminated. Pydantic-ai's vocabulary. */
export type FinishReason = 'stop' | 'length' | 'content_filter' | 'tool_call' | 'error' | string

/** A textual response segment (visible chat content). */
export interface DeltaTextPart {
  content: string
  part_kind: 'text'
}

/** Hidden chain-of-thought reasoning surfaced for trace UIs. */
export interface DeltaThinkingPart {
  content: string
  part_kind: 'thinking'
}

/** A function/tool call emitted by the model. `args` is JSON-serializable. */
export interface DeltaToolCallPart {
  args: Record<string, unknown> | string | null
  part_kind: 'tool-call'
  tool_call_id: string
  tool_name: string
}

/** A tool result fed back into the agent loop. */
export interface DeltaToolReturnPart {
  /** Tool's return payload — arbitrary JSON or string. */
  content: unknown
  outcome?: string
  part_kind: 'tool-return'
  timestamp?: string
  tool_call_id: string
  tool_name: string
}

/** Parts that may appear inside a `response` delta. */
export type DeltaResponsePart = DeltaTextPart | DeltaThinkingPart | DeltaToolCallPart

/** Parts that may appear inside a `request` delta (system/user prompts are filtered). */
export type DeltaRequestPart = DeltaToolReturnPart

export type DeltaPart = DeltaResponsePart | DeltaRequestPart

/** Tool returns flowing back into an agent. */
export interface ConversationModelRequest {
  conversation_id?: string | null
  kind: 'request'
  parts: DeltaRequestPart[]
  run_id?: string | null
  timestamp?: string | null
}

/** A model response — text/thinking/tool-call parts produced by an agent turn. */
export interface ConversationModelResponse {
  conversation_id?: string | null
  finish_reason?: FinishReason | null
  kind: 'response'
  parts: DeltaResponsePart[]
  run_id?: string | null
  state?: 'complete' | string
  timestamp?: string
}

export type ConversationModelMessage = ConversationModelRequest | ConversationModelResponse

/** A single citation from web search results. */
export interface SearchCitation {
  site_name: string
  snippet: string
  title: string
  url: string
}

/** Citation payload emitted after a web-search tool returns. */
export interface CitationsDetail {
  citations: SearchCitation[]
  search_queries: string[]
}

/** User resource changed during a conversation turn. */
export interface ResourceUpdate {
  fields: string[]
  resource_id: UUID
  resource_type: 'note' | 'artifact'
}

/** Resource update payload emitted after mutating agent tools run. */
export interface ResourceUpdatesDetail {
  resources: ResourceUpdate[]
}

/** Stream error envelope. */
export interface StreamErrorDetail {
  code: string
  details?: Record<string, unknown>
  message: string
}

/**
 * SSE message event — wraps a pydantic-ai delta with run metadata.
 *
 * `agent_run_id`/`parent_run_id`/`root_run_id` describe the agent hierarchy:
 * - `root_run_id` is a **tracker** run that wraps the turn, not an agent run
 *   itself — `agent_run_id === root_run_id` is never true. The user-visible
 *   "main" agent is identified by being the first `agent_run_id` observed in
 *   the stream (always main_agent, with `parent_run_id: null`).
 * - Sub-agents (e.g. `content_generator` invoked by the main agent) carry the
 *   parent's run id in `parent_run_id` and share the main agent's tracker
 *   `root_run_id`. Their tool calls/returns are usually internal — surface
 *   them in trace UIs, not the chat body.
 * - The post-turn `review_agent` runs under its own tracker, so it has a
 *   different `root_run_id` from main_agent's and a null `parent_run_id`. It
 *   is identified as non-main by virtue of arriving after main_agent and
 *   having a different `agent_run_id`, not by sharing tracker ids.
 */
export interface SSEMessageEvent {
  agent_name: string | null
  agent_run_id: UUID | null
  conversation_id: UUID
  created_at: UnixTimestamp
  delta: ConversationModelMessage
  message_id: UUID
  parent_run_id?: UUID | null
  root_run_id: UUID | null
  type: 'message'
}

/** Permissive payload for backend trace events that wrap pydantic-ai stream events. */
export interface AgentRunStreamTraceDelta {
  agent_name: string
  parent_run_id?: UUID | null
  payload: {
    delta?: {
      content_delta?: string | null
      part_delta_kind?: string
      tool_call_id?: string | null
      tool_name_delta?: string | null
    }
    event_kind: string
    index?: number
    part?: {
      args?: Record<string, unknown> | string | null
      content?: string
      outcome?: string
      part_kind?: string
      timestamp?: string
      tool_call_id?: string | null
      tool_name?: string
    }
    tool_call_id?: string | null
    tool_name?: string | null
  }
  root_run_id: UUID
  run_id: UUID
}

/**
 * Trace event envelope. `created_at` is optional because newer trace envelopes
 * omit it; consumers should fall back to `Date.now()` when absent.
 */
export interface SSETraceEvent {
  conversation_id: UUID
  created_at?: UnixTimestamp
  delta?: AgentRunStreamTraceDelta
  message_id: UUID
  type: 'trace'
}

/**
 * SSE content event — a chunk of visible response text. The backend streams
 * the assistant's final, user-facing answer as a sequence of `content`
 * envelopes (concatenate `delta`s to rebuild the full reply).
 */
export interface SSEContentEvent {
  conversation_id: UUID
  created_at: UnixTimestamp
  delta: string
  message_id: UUID
  type: 'content'
}

/** SSE citations event — emitted after web-search tools return. */
export interface SSECitationsEvent {
  citations: CitationsDetail
  conversation_id: UUID
  created_at: UnixTimestamp
  message_id: UUID
  type: 'citations'
}

/** SSE resource_updated event — emitted after a mutating agent tool updates resources. */
export interface SSEResourceUpdatedEvent {
  conversation_id: UUID
  created_at: UnixTimestamp
  message_id: UUID
  resource_updates: ResourceUpdatesDetail
  type: 'resource_updated'
}

/** SSE done event — terminal envelope for a turn. */
export interface SSEDoneEvent {
  conversation_id: UUID
  created_at: UnixTimestamp
  finish_reason: 'stop' | 'error' | 'clarification_requested'
  message_id: UUID
  suggested_actions?: SuggestedAction[] | null
  type: 'done'
}

/** SSE error event — terminal envelope when the turn fails. */
export interface SSEErrorEvent {
  conversation_id?: UUID
  created_at?: UnixTimestamp
  error?: StreamErrorDetail
  finish_reason?: 'error'
  message_id?: UUID
  type: 'error'
}

// ============================================================================
// Clarification (Human-in-the-Loop)
// ============================================================================

export interface ClarificationOption {
  description?: string
  label: string
  recommended: boolean
}

export interface ClarificationFreeText {
  label: string
  placeholder?: string
}

export interface ClarificationQuestion {
  /** Legacy UI metadata from older clarification payloads. */
  allow_multiple?: boolean
  free_text?: ClarificationFreeText
  header?: string
  id: string
  options: ClarificationOption[]
  prompt: string
  reason?: string
  /** Legacy UI metadata from older clarification payloads. */
  required?: boolean
  /** Legacy UI metadata from older clarification payloads. */
  type?: 'multiple_choice'
}

export interface ClarificationRequestedPayload {
  conversation_id: UUID
  kind: 'requested'
  message_id: UUID
  questions: ClarificationQuestion[]
  reason: string
  remaining_question_budget: number
  request_id: UUID
}

export interface ClarificationResolvedPayload {
  answers: { question_id: string; value: string | string[] }[]
  assistant_summary: string
  conversation_id: UUID
  kind: 'resolved'
  message_id: UUID
  note?: string | null
  request_id: UUID
  response_assistant_message_id?: UUID | null
  response_run_id?: UUID | null
  status: ClarificationResolutionStatus
}

export type ClarificationPayload = ClarificationRequestedPayload | ClarificationResolvedPayload

/** SSE clarification_requested event — agent paused for user input. */
export interface SSEClarificationRequestedEvent {
  clarification: ClarificationRequestedPayload
  conversation_id: UUID
  message_id: UUID
  type: 'clarification_requested'
}

/** SSE clarification_resolved event — user responded, agent resuming. */
export interface SSEClarificationResolvedEvent {
  clarification: ClarificationResolvedPayload
  conversation_id: UUID
  message_id: UUID
  type: 'clarification_resolved'
}

/** Union of all SSE event envelopes. */
export type SSEEvent =
  | SSEMessageEvent
  | SSETraceEvent
  | SSEContentEvent
  | SSECitationsEvent
  | SSEResourceUpdatedEvent
  | SSEDoneEvent
  | SSEErrorEvent
  | SSEClarificationRequestedEvent
  | SSEClarificationResolvedEvent
