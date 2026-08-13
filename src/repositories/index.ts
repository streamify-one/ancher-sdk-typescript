/**
 * Repository layer — plain-data repositories over the generated client.
 *
 * Each `sdk.X` is a repository whose methods return plain `Schemas`-typed data
 * (no model instances). List methods take the TypeScript-native
 * `{ where, orderBy, … }` options; the option/`Where` types live in
 * `../contracts` and are consumed via `@ancher-ai/sdk/contracts`.
 */

export type { ApiKeyRepository } from './api-key'
export type {
  ArtifactContentOptions,
  ArtifactContentUpdateOptions,
  ArtifactDownloadKind,
  ArtifactDownloadOptions,
  ArtifactPresignedUrlOptions,
  ArtifactRepository,
} from './artifact'
export { createListSurface, type ListSurface, type Page } from './base'
export type { CollectionRepository } from './collection'
export type { ConnectionProvider, ConnectionRepository } from './connection'
export type { ConversationRepository, ConversationRunOptions } from './conversation'
export type { DailyDigestRepository } from './daily-digest'
export type {
  FileDownloadOptions,
  FilePresignedUrlOptions,
  FileRepository,
  UploadBatchOptions,
  UploadDirectOptions,
  UploadFileOptions,
} from './file'
export type { MessageRepository } from './message'
export type {
  NoteContentOptions,
  NoteDownloadOptions,
  NoteFileContentUpdateOptions,
  NotePresignedUrlOptions,
  NoteRepository,
  NoteRetryQuery,
} from './note'
export type { NotificationRepository } from './notification'
export type { PinnedRepository } from './pinned'
export type {
  PresignedDownloadOptions,
  PresignedUrlKind,
  PresignedUrlQueryOptions,
} from './presigned-download'
export type { RawContentOptions } from './raw-content'
export { buildListQuery, type AnyListOptions, type WireListQuery } from './query'
export type { RecommendationRepository } from './recommendation'
export type { Session, SessionRepository } from './session'
export type { SuggestionRepository } from './suggestion'
export type { TagRepository } from './tag'
export type { UserRepository } from './user'
