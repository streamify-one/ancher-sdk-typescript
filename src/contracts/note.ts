/**
 * Note (Knowledge Base) types: entities, enums, and typed list options for the
 * note + tag endpoints.
 */

import type { Eq, Expect } from './assert'
import type { GetEndpointQuery, Page } from './common'
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

/** Note processing status. */
export const NoteStatus = {
  Queued: 'queued',
  Processing: 'processing',
  Ready: 'ready',
  Error: 'error',
} as const satisfies Record<string, Schemas.Note['status']>
export type NoteStatus = (typeof NoteStatus)[keyof typeof NoteStatus]
/** @internal */
export type _NoteStatusExhaustive = Expect<Eq<NoteStatus, Schemas.Note['status']>>

/** Article status (same lifecycle as note). */
export type ArticleStatus = NoteStatus

/** User reaction on a note / artifact / message. */
export const ReactionType = {
  Like: 'like',
  Dislike: 'dislike',
  Neutral: 'neutral',
} as const satisfies Record<string, NonNullable<Schemas.Note['reaction']>>
export type ReactionType = (typeof ReactionType)[keyof typeof ReactionType]
/** @internal */
export type _ReactionNoteExhaustive = Expect<Eq<ReactionType, NonNullable<Schemas.Note['reaction']>>>
/** @internal */
export type _ReactionArtifactExhaustive = Expect<
  Eq<ReactionType, NonNullable<Schemas.Artifact['reaction']>>
>
/** @internal */
export type _ReactionMessageExhaustive = Expect<
  Eq<ReactionType, NonNullable<Schemas.Message['reaction']>>
>

/**
 * Shared tag/collection palette color. Checked against both generated unions
 * so a backend divergence forces an explicit split here.
 */
export const PaletteColor = {
  Neutral: 'neutral',
  Slate: 'slate',
  Gray: 'gray',
  Zinc: 'zinc',
  Stone: 'stone',
  Red: 'red',
  Orange: 'orange',
  Amber: 'amber',
  Yellow: 'yellow',
  Lime: 'lime',
  Green: 'green',
  Emerald: 'emerald',
  Teal: 'teal',
  Cyan: 'cyan',
  Sky: 'sky',
  Blue: 'blue',
  Indigo: 'indigo',
  Violet: 'violet',
  Purple: 'purple',
  Fuchsia: 'fuchsia',
  Pink: 'pink',
  Rose: 'rose',
} as const satisfies Record<string, Schemas.Tag['color']>
export type PaletteColor = (typeof PaletteColor)[keyof typeof PaletteColor]
/** @internal */
export type _PaletteTagExhaustive = Expect<Eq<PaletteColor, Schemas.Tag['color']>>
/** @internal */
export type _PaletteCollectionExhaustive = Expect<
  Eq<PaletteColor, NonNullable<Schemas.Collection['color']>>
>

/* ---------------------------------------------------------------------------
 * Tag entity + list surface (tags are a note-domain resource).
 * ------------------------------------------------------------------------- */

/** Tag entity */
export type Tag = Schemas.Tag

/** Create tag request */
export type CreateTagRequest = Schemas.TagCreate

/** Update tag request */
export type UpdateTagRequest = Schemas.TagUpdate

/** Tag list response */
export type TagListResponse = Page<Tag>

type TagListEndpointQuery = GetEndpointQuery<'/api/v1/tags/'>

/** Typed filter for tag lists. */
export type TagWhere = Where<BranchOf<TagListEndpointQuery>>

/** Signed sort keys for tag lists (e.g. `'-created_at'`). */
export type TagOrderBy = OrderByOf<TagListEndpointQuery>

/** Options for `sdk.Tag.list` / `count` / `iterate`. */
export type TagListOptions = ListOptions<TagWhere, TagOrderBy>

/** @internal */
export type _TagNoOpCollision = Expect<NoOperatorCollision<BranchOf<TagListEndpointQuery>>>

/** Add tags to note request */
export type AddTagsToNoteRequest = Schemas.NoteTagsUpdate

/** Create and add tag to note request */
export interface CreateTagForNoteRequest {
  color?: string
  name: string
}

/* ---------------------------------------------------------------------------
 * Note entity.
 * ------------------------------------------------------------------------- */

/** Named file map returned by the API */
export type FileMap = Record<string, Schemas.File>

/**
 * Cast the untyped `files` field on Note / Article to a typed FileMap.
 * The OpenAPI schema types `files` as `Record<string, unknown>` but the
 * actual payload contains `File` objects keyed by role (e.g. "thumbnail",
 * "content").
 */
export function asFileMap(files: Record<string, unknown> | null | undefined): FileMap | undefined {
  if (!files || Object.keys(files).length === 0) return undefined
  return files as FileMap
}

/** Article (parsed content from note) */
export type Article = Schemas.Article

/**
 * FE-only fields that are not part of the OpenAPI `Note` schema. `pinned`
 * is derived client-side from the pinned-notes list.
 */
interface NoteLocalFields {
  pinned?: boolean
}

/** Note entity — the OpenAPI schema plus FE-only local fields. */
export type Note = Schemas.Note & NoteLocalFields

/* ---------------------------------------------------------------------------
 * Note create/copy requests.
 * ------------------------------------------------------------------------- */

/** Create note from text request */
export type CreateNoteFromTextRequest = Schemas.ArticleCreateFromText

/** Create note from URL request */
export interface CreateNoteFromUrlRequest {
  /** Optional user comment (triggers fresh parsing) */
  comment?: string | null
  /** URL or share text containing a URL */
  text: string
}

/** Create note from a full conversation */
export type CreateNoteFromConversationRequest = Schemas.NoteCreateFromConversation

/** Create note from a single message */
export type CreateNoteFromMessageRequest = Schemas.NoteCreateFromMessage

/** Create note from an artifact */
export type CreateNoteFromArtifactRequest = Schemas.NoteCreateFromArtifact

/** Create note from file request */
export interface CreateNoteFromFileRequest {
  /** Optional user comment (triggers fresh parsing) */
  comment?: string | null
  /** ID of the uploaded file */
  file_id: string
}

/** Copy note request */
export type CopyNoteRequest = Schemas.NoteCopy

/* ---------------------------------------------------------------------------
 * Note list surface.
 * ------------------------------------------------------------------------- */

/** Note list response */
export type NoteListResponse = Page<Note>

type NoteListEndpointQuery = GetEndpointQuery<'/api/v1/notes/'>

/**
 * Typed filter for note lists. Includes the nested relation criteria
 * (`tags`, `article`, `file_refs`, …) the top-level notes endpoint supports —
 * relations are legal at the root of the `where`, not inside `AND`/`OR`/`NOT`.
 */
export type NoteWhere = Where<BranchOf<NoteListEndpointQuery>>

/** Signed sort keys for note lists (e.g. `'-updated_at'`, `'+title'`). */
export type NoteOrderBy = OrderByOf<NoteListEndpointQuery>

/** Options for `sdk.Note.list` / `count` / `iterate`. */
export type NoteListOptions = ListOptions<NoteWhere, NoteOrderBy>

/** @internal */
export type _NoteNoOpCollision = Expect<NoOperatorCollision<BranchOf<NoteListEndpointQuery>>>

/* ---------------------------------------------------------------------------
 * Suggested collections for a note (CollectionSuggestion sub-list).
 * ------------------------------------------------------------------------- */

type NoteSuggestedCollectionsEndpointQuery =
  GetEndpointQuery<'/api/v1/notes/{note_id}/suggested-collections'>

/** Typed filter for a note's suggested-collections list. */
export type NoteSuggestedCollectionsWhere = Where<BranchOf<NoteSuggestedCollectionsEndpointQuery>>

/** Signed sort keys for a note's suggested-collections list. */
export type NoteSuggestedCollectionsOrderBy = OrderByOf<NoteSuggestedCollectionsEndpointQuery>

/** Options for `sdk.Note.suggestedCollections`. */
export type NoteSuggestedCollectionsOptions = ListOptions<
  NoteSuggestedCollectionsWhere,
  NoteSuggestedCollectionsOrderBy
>

/** @internal */
export type _NoteSuggestedCollectionsNoOpCollision = Expect<
  NoOperatorCollision<BranchOf<NoteSuggestedCollectionsEndpointQuery>>
>
