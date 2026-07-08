/**
 * Message repository. Messages are sub-resources of a conversation;
 * the repository is keyed by `conversationId`. The list takes the
 * TypeScript-native `{ where, orderBy, … }` options (see `../contracts/query`).
 */

import type { AncherClient } from '../api/client'
import type { EndpointByMethod, Schemas } from '../api/generated/api.client'
import type { Message, MessageListOptions } from '../contracts/conversation'
import type { Page } from './base'
import { buildListQuery } from './query'

type MessageListEndpointQuery =
  EndpointByMethod['get']['/api/v1/conversations/{conversation_id}/messages']['parameters']['query']

export interface MessageRepository {
  /** Get a single message in a conversation. */
  get(conversationId: string, messageId: string): Promise<Message>
  /** List messages in a conversation (paginated). */
  list(conversationId: string, options?: MessageListOptions): Promise<Page<Message>>
  /** Update a message (e.g. set a reaction). */
  update(
    conversationId: string,
    messageId: string,
    patch: Schemas.MessageUpdateRequest
  ): Promise<Message>
}

export function createMessageRepository(client: AncherClient): MessageRepository {
  // The contracts `Message` refines the generated `Schemas.Message`: codegen
  // flattens the `clarification` discriminated union (`kind: string`), so the
  // SDK asserts the real, narrower client shape (`kind: 'requested' | 'resolved'`)
  // at this boundary. Localized to the repo — callers get the refined type.
  return {
    async list(conversationId, options) {
      return (await client.api.get('/api/v1/conversations/{conversation_id}/messages', {
        path: { conversation_id: conversationId },
        query: buildListQuery(options) as MessageListEndpointQuery,
      })) as unknown as Page<Message>
    },
    async get(conversationId, messageId) {
      return (await client.api.get('/api/v1/conversations/{conversation_id}/messages/{message_id}', {
        path: { conversation_id: conversationId, message_id: messageId },
      })) as unknown as Message
    },
    async update(conversationId, messageId, patch) {
      return (await client.api.patch(
        '/api/v1/conversations/{conversation_id}/messages/{message_id}',
        {
          path: { conversation_id: conversationId, message_id: messageId },
          body: patch,
        }
      )) as unknown as Message
    },
  }
}
