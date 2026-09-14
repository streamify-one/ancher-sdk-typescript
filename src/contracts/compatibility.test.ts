import { describe, expectTypeOf, it } from 'vitest'
import type { Artifact } from './artifact'
import type { ConversationWithPreview, Message } from './conversation'
import type { DailyDigest } from './daily-digest'
import type { File } from './file'
import type { Note } from './note'
import type { PinListResponse, PinnedItem } from './pin'
import type {
  ContentRecommendationNotification,
  DailyDigestNotification,
} from './notification'
import type { Podcast } from './podcast'
import type { Recommendation } from './recommendation'
import type { ChunkRetrievalResult, NoteRetrievalResult } from './search'
import type { Schemas } from './schemas'
import type { CollectionSuggestion, SuggestionBatchResult } from './suggestion'

type LegacyFileRevision = Omit<Schemas.FileRevision, 'metadata' | 'mimetype' | 'size'> & {
  s3_object: Schemas.S3Object | null
}

type LegacyFile = Omit<Schemas.File, 'metadata' | 'revision_number'> & {
  current_revision_id: string | null
  revision: LegacyFileRevision | null
  s3_id: string
  user_id: string | null
}

type LegacyArticle = Omit<
  Schemas.Article,
  'content_file' | 'content_tldr_file' | 'display_file' | 'files' | 'origin_files' | 'thumbnail_file'
> & {
  files: Record<string, LegacyFile>
  origin_files: LegacyFile[]
}

type LegacyNote = Omit<
  Schemas.Note,
  | 'author'
  | 'content_file'
  | 'content_tldr_file'
  | 'display_file'
  | 'files'
  | 'language'
  | 'origin_files'
  | 'podcast'
  | 'published_date'
  | 'site_name'
  | 'thumbnail_file'
  | 'url'
> & {
  article: LegacyArticle | null
  article_id: string
  files: Record<string, LegacyFile>
}

type LegacyPodcast = Omit<
  Schemas.Podcast,
  'duration_seconds' | 'file' | 'target_minutes' | 'transcript_file' | 'transcript_file_id'
> & {
  file: LegacyFile | null
}

type LegacyDailyDigest = Omit<
  Schemas.DailyDigest,
  | 'duration_seconds'
  | 'file'
  | 'notes'
  | 'target_minutes'
  | 'transcript_file'
  | 'transcript_file_id'
> & {
  file: LegacyFile | null
  notes: LegacyNote[]
}

type LegacyRecommendation = Omit<
  Schemas.Recommendation,
  'batch_id' | 'cluster_run_id' | 'slot_index' | 'source'
>

type LegacyChunkRetrievalResult = Omit<Schemas.ChunkRetrievalResult, 'score'> & {
  file_ref: LegacyFileReference | null
}

type LegacyNoteRetrievalResult = Omit<Schemas.NoteRetrievalResult, 'artifact' | 'note'> & {
  artifact?: LegacyArtifact | null
  note?: LegacyNote | null
}

type LegacyCollectionSuggestion = Omit<Schemas.CollectionSuggestion, 'note'> & {
  note: LegacyNote | null
}

type CurrentContentRecommendationNotification = Omit<
  Schemas.ContentRecommendationEnvelope,
  'type'
> & {
  type: 'content_recommendation'
}

type LegacyContentRecommendationNotification = Omit<
  Schemas.ContentRecommendationEnvelope,
  'recommendation' | 'type'
> & {
  recommendation: LegacyRecommendation
  type: 'content_recommendation'
}

type CurrentDailyDigestNotification = Omit<Schemas.DailyDigestEnvelope, 'type'> & {
  type: 'daily_digest'
}

type LegacyDailyDigestNotification = Omit<Schemas.DailyDigestEnvelope, 'digest' | 'type'> & {
  digest: LegacyDailyDigest
  type: 'daily_digest'
}

type LegacyArtifact = Omit<
  Schemas.Artifact,
  'content_file' | 'display_file' | 'files' | 'thumbnail_file'
> & {
  files: Record<string, LegacyFile>
}

type LegacyFileReference = Omit<Schemas.LegacyFileReference, 'file'> & {
  file: LegacyFile | null
}

type LegacyMessageFileReference = Omit<Schemas.LegacyMessageFileReference, 'file_ref'> & {
  file_ref: LegacyFileReference | null
}

type V15Message = Omit<Schemas.Message, 'clarification'> & Pick<Message, 'clarification'>
type LegacyMessage = Omit<
  Schemas.Message,
  | 'clarification'
  | 'files'
  | 'message_file_references'
  | 'voice_file'
  | 'voice_file_reference'
> &
  Pick<Message, 'clarification'> & {
    message_file_references: LegacyMessageFileReference[]
    voice_file_reference: LegacyFileReference | null
  }

type LegacySuggestionBatchResult = Omit<Schemas.SuggestionBatchResult, 'suggestion'> & {
  suggestion: LegacyCollectionSuggestion | null
}

type CurrentConversationWithPreview = Schemas.Conversation & {
  last_message?: V15Message | null
}

type LegacyConversationWithPreview = Schemas.Conversation & {
  last_message?: LegacyMessage | null
}

type LegacyPinnedItem = Omit<Schemas.PinnedItemEnvelope, 'artifact' | 'note'> & {
  artifact: LegacyArtifact | null
  note: LegacyNote | null
}

type LegacyPinListResponse = Omit<Schemas.Page_PinnedItemEnvelope_, 'items'> & {
  items: LegacyPinnedItem[]
}

describe('public entity compatibility', () => {
  it('accepts both v1.4 and v1.5 entity payloads', () => {
    expectTypeOf<Schemas.File>().toExtend<File>()
    expectTypeOf<LegacyFile>().toExtend<File>()
    expectTypeOf<Schemas.Note>().toExtend<Note>()
    expectTypeOf<LegacyNote>().toExtend<Note>()
    expectTypeOf<Schemas.Podcast>().toExtend<Podcast>()
    expectTypeOf<LegacyPodcast>().toExtend<Podcast>()
    expectTypeOf<Schemas.DailyDigest>().toExtend<DailyDigest>()
    expectTypeOf<LegacyDailyDigest>().toExtend<DailyDigest>()
    expectTypeOf<Schemas.Recommendation>().toExtend<Recommendation>()
    expectTypeOf<LegacyRecommendation>().toExtend<Recommendation>()
    expectTypeOf<Schemas.ChunkRetrievalResult>().toExtend<ChunkRetrievalResult>()
    expectTypeOf<LegacyChunkRetrievalResult>().toExtend<ChunkRetrievalResult>()
    expectTypeOf<Schemas.NoteRetrievalResult>().toExtend<NoteRetrievalResult>()
    expectTypeOf<LegacyNoteRetrievalResult>().toExtend<NoteRetrievalResult>()
    expectTypeOf<Schemas.CollectionSuggestion>().toExtend<CollectionSuggestion>()
    expectTypeOf<LegacyCollectionSuggestion>().toExtend<CollectionSuggestion>()
    expectTypeOf<Schemas.SuggestionBatchResult>().toExtend<SuggestionBatchResult>()
    expectTypeOf<LegacySuggestionBatchResult>().toExtend<SuggestionBatchResult>()
    expectTypeOf<CurrentContentRecommendationNotification>().toExtend<
      ContentRecommendationNotification
    >()
    expectTypeOf<LegacyContentRecommendationNotification>().toExtend<
      ContentRecommendationNotification
    >()
    expectTypeOf<CurrentDailyDigestNotification>().toExtend<DailyDigestNotification>()
    expectTypeOf<LegacyDailyDigestNotification>().toExtend<DailyDigestNotification>()
    expectTypeOf<Schemas.Artifact>().toExtend<Artifact>()
    expectTypeOf<LegacyArtifact>().toExtend<Artifact>()
    expectTypeOf<V15Message>().toExtend<Message>()
    expectTypeOf<LegacyMessage>().toExtend<Message>()
    expectTypeOf<CurrentConversationWithPreview>().toExtend<ConversationWithPreview>()
    expectTypeOf<LegacyConversationWithPreview>().toExtend<ConversationWithPreview>()
    expectTypeOf<Schemas.PinnedItemEnvelope>().toExtend<PinnedItem>()
    expectTypeOf<LegacyPinnedItem>().toExtend<PinnedItem>()
    expectTypeOf<Schemas.Page_PinnedItemEnvelope_>().toExtend<PinListResponse>()
    expectTypeOf<LegacyPinListResponse>().toExtend<PinListResponse>()
    // Read the nested types themselves: a loosened alias would still satisfy `toExtend`.
    expectTypeOf<PinListResponse['items'][number]>().toEqualTypeOf<PinnedItem>()
    expectTypeOf<NonNullable<ConversationWithPreview['last_message']>>().toEqualTypeOf<Message>()
  })
})
