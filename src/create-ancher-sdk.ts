/**
 * SDK layer — entity repositories + action services composed over the raw API
 * layer.
 *
 * The raw layer ({@link createAncherClient}) is 1:1 with the OpenAPI spec. This
 * layer exposes one ergonomic **repository** per resource; every method returns
 * plain `Schemas`-typed data (no model instances). Repositories hold every op —
 * `create`/`get`/`list` plus id-keyed mutations like `update(id, …)` and
 * `delete(id)`. Friendly entity types live in `@ancher-ai/sdk/contracts`.
 */

import { type AncherClient, createAncherClient } from './api/client'
import type { AncherClientConfig } from './api/config'
import { type ApiKeyRepository, createApiKeyRepository } from './repositories/api-key'
import {
  type ArtifactRepository,
  createArtifactRepository,
} from './repositories/artifact'
import { type CollectionRepository, createCollectionRepository } from './repositories/collection'
import { type ConnectionRepository, createConnectionRepository } from './repositories/connection'
import { type ConversationRepository, createConversationRepository } from './repositories/conversation'
import { createFileRepository, type FileRepository } from './repositories/file'
import { createMessageRepository, type MessageRepository } from './repositories/message'
import { createNoteRepository, type NoteRepository } from './repositories/note'
import { createNotificationRepository, type NotificationRepository } from './repositories/notification'
import { createPinnedRepository, type PinnedRepository } from './repositories/pinned'
import {
  createRecommendationRepository,
  type RecommendationRepository,
} from './repositories/recommendation'
import { createSessionRepository, type SessionRepository } from './repositories/session'
import { createSuggestionRepository, type SuggestionRepository } from './repositories/suggestion'
import { createTagRepository, type TagRepository } from './repositories/tag'
import { createUserRepository, type UserRepository } from './repositories/user'
import {
  type BillingRepository,
  createBillingRepository,
  createDeviceRepository,
  createImagePromptRepository,
  createRetrievalRepository,
  createTextSelectionRepository,
  createWebSessionRepository,
  type DeviceRepository,
  type ImagePromptRepository,
  type RetrievalRepository,
  type TextSelectionRepository,
  type WebSessionRepository,
} from './services'

export type {
  AgentRun,
  ChatCitation,
  ChatEvent,
  ChatFinishReason,
  ChatHandlers,
  ChatResourceUpdate,
  ChatResult,
  ChatStreamOptions,
} from './chat'
// Re-export the SDK surface (repository types + chat helpers). Friendly entity
// types are exported from `@ancher-ai/sdk/contracts`.
export {
  consumeChat,
  openConversationStream,
  parseChatStream,
  streamConversation,
  streamConversationUrl,
} from './chat'
export type { ApiKeyRepository } from './repositories/api-key'
export type {
  ArtifactContentOptions,
  ArtifactContentUpdateOptions,
  ArtifactDownloadKind,
  ArtifactDownloadOptions,
  ArtifactPresignedUrlOptions,
  ArtifactRepository,
} from './repositories/artifact'
export { createListSurface, type ListSurface, type Page } from './repositories/base'
export type { CollectionRepository } from './repositories/collection'
export type { ConnectionProvider, ConnectionRepository } from './repositories/connection'
export type { ConversationRepository, ConversationRunOptions } from './repositories/conversation'
export type {
  FileDownloadOptions,
  FilePresignedUrlOptions,
  FileRepository,
  UploadBatchOptions,
  UploadDirectOptions,
  UploadFileOptions,
} from './repositories/file'
export type { MessageRepository } from './repositories/message'
export type {
  NoteContentOptions,
  NoteDownloadOptions,
  NoteFileContentUpdateOptions,
  NotePresignedUrlOptions,
  NoteRepository,
  NoteRetryQuery,
} from './repositories/note'
export type { NotificationRepository } from './repositories/notification'
export type { PinnedRepository } from './repositories/pinned'
export { buildListQuery, type AnyListOptions, type WireListQuery } from './repositories/query'
export type {
  PresignedDownloadOptions,
  PresignedUrlKind,
  PresignedUrlQueryOptions,
} from './repositories/presigned-download'
export type { RawContentOptions } from './repositories/raw-content'
export type { RecommendationRepository } from './repositories/recommendation'
export type { Session, SessionRepository } from './repositories/session'
export type { SuggestionRepository } from './repositories/suggestion'
export type { TagRepository } from './repositories/tag'
export type { UserRepository } from './repositories/user'
export type {
  BillingRepository,
  DeviceRepository,
  ImagePromptRepository,
  PlansProvider,
  RetrievalRepository,
  TextSelectionRepository,
  WebSessionProvider,
  WebSessionRepository,
} from './services'

export interface AncherSdk {
  /** API keys — `list`, `create`, `delete(id)` (revoke). */
  ApiKey: ApiKeyRepository
  /** Artifacts — CRUD/list, `getContent`/`updateContent`, `presignedUrl(id)`, `download(id)`. */
  Artifact: ArtifactRepository

  // Action/singleton services — return plain typed results.
  /** Billing — credits, subscription, checkout, plans, purchases, discount codes. */
  Billing: BillingRepository
  /** Collections — `list`/`count`/`iterate`, CRUD, note/artifact membership + scoped sub-lists. */
  Collection: CollectionRepository
  /** External OAuth connections — `list`/`connect`/`delete(provider)`. */
  Connection: ConnectionRepository
  /** Conversations — `list`/`count`/`iterate`, `get`/`start`, `send`/`interrupt`/`update`/`delete` by id, chat streaming. */
  Conversation: ConversationRepository
  /** The raw API layer — generated typed client (`api`), `upload`, resolved `config`. */
  client: AncherClient
  /** Device — push notification token. */
  Device: DeviceRepository
  /** Files — presigned upload/download, `uploadBatch`, `get`, `verify(id)`, `delete(id)`, revisions list + revert. */
  File: FileRepository
  /** Image prompts — generate a prompt from an image. */
  ImagePrompt: ImagePromptRepository
  /** Messages (conversation sub-resource) — `list(conversationId)`, `get`, `update`. */
  Message: MessageRepository

  // Entity repositories — return plain `Schemas`-typed data.
  /** Notes — create variants, CRUD/list, retry/copy, display and note-file downloads. */
  Note: NoteRepository
  /** Notifications — `list`/`count`/`iterate`, `markRead(id)`/`markDismissed(id)`. */
  Notification: NotificationRepository
  /** Pinned items — `list`/`count`/`iterate`, `pin`/`reorder`/`unpin`. */
  Pinned: PinnedRepository
  /** Content recommendations — `list`/`count`/`iterate`, `save(id)`/`dismiss(id)`/`notInterested(id)`. */
  Recommendation: RecommendationRepository
  /** Retrieval (RAG) — `notes`/`chunks` for a query. */
  Retrieval: RetrievalRepository
  /** Active sessions — `list`/`count`/`iterate`, `current` (token session), `revoke(id)`/`revokeAll`. */
  Session: SessionRepository
  /** Collection suggestions — `list`/`count`/`iterate`, batch + per-id accept/dismiss. */
  Suggestion: SuggestionRepository
  /** Tags — `list`/`count`/`iterate`, `create`, `update(id)`/`delete(id)`. */
  Tag: TagRepository
  /** Text selections — `explain`/`summarize`/`translate` for the selection toolbar. */
  TextSelection: TextSelectionRepository
  /** Current user — `me`, `register`, account update/delete, preferences/flags. */
  User: UserRepository
  /** Browser cookie session — `current`, `login`/`loginWithProvider`, `refresh`, `logout`. */
  WebSession: WebSessionRepository
}

/**
 * Build the SDK layer. Pass a {@link AncherClientConfig} to construct the raw
 * client, or an existing {@link AncherClient} to layer over one you already made.
 *
 * @example
 * ```ts
 * const sdk = createAncherSdk({ apiKey: process.env.ANCHER_API_KEY })
 * const note = await sdk.Note.createFromUrl({ text: 'https://example.com' }) // → plain Note
 * await sdk.Note.update(note.id, { title: 'Renamed' })   // id-keyed repo method
 * const col = await sdk.Collection.create({ name: 'Reading' })
 * await sdk.Collection.addNote(col.id, note.id)
 * const { remaining } = (await sdk.Billing.credits()).topup
 * ```
 */
export function createAncherSdk(input: AncherClient | AncherClientConfig = {}): AncherSdk {
  const client = 'api' in input ? input : createAncherClient(input)
  return {
    client,
    Note: createNoteRepository(client),
    File: createFileRepository(client),
    User: createUserRepository(client),
    ApiKey: createApiKeyRepository(client),
    Artifact: createArtifactRepository(client),
    Tag: createTagRepository(client),
    Collection: createCollectionRepository(client),
    Conversation: createConversationRepository(client),
    Message: createMessageRepository(client),
    Pinned: createPinnedRepository(client),
    Notification: createNotificationRepository(client),
    Suggestion: createSuggestionRepository(client),
    Recommendation: createRecommendationRepository(client),
    Session: createSessionRepository(client),
    Connection: createConnectionRepository(client),
    Billing: createBillingRepository(client),
    Device: createDeviceRepository(client),
    Retrieval: createRetrievalRepository(client),
    ImagePrompt: createImagePromptRepository(client),
    TextSelection: createTextSelectionRepository(client),
    WebSession: createWebSessionRepository(client),
  }
}
