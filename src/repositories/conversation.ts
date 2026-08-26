/**
 * Conversation repository (`/conversations`).
 *
 * Based on `Schemas.Conversation` (api#117's single shape for both the
 * single-fetch and list forms). Lists take the TypeScript-native
 * `{ where, orderBy, … }` options (see `../contracts/query`). Chat is a
 * streaming operation: `start`/`send` return a `ConversationRunReceipt`
 * (HTTP 202) — consuming the SSE event stream from
 * `GET /conversations/{id}/stream` is left to the caller for now.
 */

import type { AncherClient } from '../api/client'
import type { EndpointByMethod, Schemas } from '../api/generated/api.client'
import type {
  Conversation,
  ConversationOrderBy,
  ConversationWhere,
} from '../contracts/conversation'
import {
  type ChatEvent,
  type ChatStreamOptions,
  streamConversation,
  streamConversationUrl,
} from '../chat'
import { createListSurface, type ListSurface } from './base'

type ConversationListEndpointQuery =
  EndpointByMethod['get']['/api/v1/conversations']['parameters']['query']

export interface ConversationRunOptions {
  /** Abort the run-trigger POST (e.g. the chat UI cancelling an in-flight send). */
  signal?: AbortSignal
}

export interface ConversationRepository
  extends ListSurface<Conversation, ConversationWhere, ConversationOrderBy> {
  /** Get a conversation by id. */
  get(conversationId: string): Promise<Conversation>
  /** Start a new conversation/chat; returns the run receipt (HTTP 202). */
  start(
    body: Schemas.ChatRequestSchema,
    options?: ConversationRunOptions
  ): Promise<Schemas.ConversationRunReceipt>
  /** Start a new conversation and stream the reply as structured {@link ChatEvent}s. */
  startChat(body: Schemas.ChatRequestSchema, opts?: ChatStreamOptions): AsyncGenerator<ChatEvent>
  /** Rename / repin a conversation (`PATCH`); returns the updated conversation. */
  update(
    conversationId: string,
    patch: Schemas.ConversationUpdateRequest
  ): Promise<Conversation>
  /** Delete a conversation (`DELETE`). */
  delete(conversationId: string): Promise<void>
  /** Send a message into a conversation; returns the run receipt (HTTP 202). */
  send(
    conversationId: string,
    body: Schemas.ChatRequestSchema,
    options?: ConversationRunOptions
  ): Promise<Schemas.ConversationRunReceipt>
  /** Send a message and stream the reply as structured {@link ChatEvent}s. */
  chat(
    conversationId: string,
    body: Schemas.ChatRequestSchema,
    opts?: ChatStreamOptions
  ): AsyncGenerator<ChatEvent>
  /** Tail any conversation's chat stream as structured {@link ChatEvent}s. */
  stream(conversationId: string, opts?: ChatStreamOptions): AsyncGenerator<ChatEvent>
  /** Request interruption of a conversation's active run. */
  interrupt(conversationId: string): Promise<void>
}

export function createConversationRepository(client: AncherClient): ConversationRepository {
  const listSurface = createListSurface<Conversation, ConversationWhere, ConversationOrderBy>(
    (query) =>
      client.api.get('/api/v1/conversations', {
        query: query as ConversationListEndpointQuery,
      })
  )

  return {
    ...listSurface,
    async get(conversationId) {
      return await client.api.get('/api/v1/conversations/{conversation_id}', {
        path: { conversation_id: conversationId },
      })
    },
    async start(body, options) {
      return client.api.post('/api/v1/conversations', {
        body,
        ...(options?.signal ? { overrides: { signal: options.signal } } : {}),
      })
    },
    async *startChat(body, opts) {
      const receipt = await client.api.post('/api/v1/conversations', { body })
      if (receipt.status !== 'running') return
      yield* streamConversationUrl(client, receipt.stream_url, opts ?? {})
    },
    async update(conversationId, patch) {
      return await client.api.patch('/api/v1/conversations/{conversation_id}', {
        path: { conversation_id: conversationId },
        body: patch,
      })
    },
    async delete(conversationId) {
      await client.api.delete('/api/v1/conversations/{conversation_id}', {
        path: { conversation_id: conversationId },
      })
    },
    async send(conversationId, body, options) {
      return client.api.post('/api/v1/conversations/{conversation_id}', {
        path: { conversation_id: conversationId },
        body,
        ...(options?.signal ? { overrides: { signal: options.signal } } : {}),
      })
    },
    async *chat(conversationId, body, opts) {
      const receipt = await client.api.post('/api/v1/conversations/{conversation_id}', {
        path: { conversation_id: conversationId },
        body,
      })
      if (receipt.status !== 'running') return
      yield* streamConversationUrl(client, receipt.stream_url, opts ?? {})
    },
    stream(conversationId, opts) {
      return streamConversation(client, conversationId, opts ?? {})
    },
    async interrupt(conversationId) {
      await client.api.post('/api/v1/conversations/{conversation_id}/interruption', {
        path: { conversation_id: conversationId },
      })
    },
  }
}
