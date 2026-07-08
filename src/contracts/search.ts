/**
 * Search types for semantic and keyword search
 */

import type { UUID } from './common'
import type { Note } from './note'
import type { Schemas } from './schemas'

/** Search result item with relevance score */
export interface SearchResult {
  highlights?: SearchHighlight[]
  note: Note
  score: number
}

/** Highlighted text snippet */
export interface SearchHighlight {
  field: 'title' | 'content' | 'tags' | 'url' | 'comment'
  matches: Array<{ start: number; end: number }>
  snippet: string
}

/** Search request parameters */
export interface SearchRequest {
  folder_id?: UUID | null
  limit?: number
  mode?: 'keyword' | 'semantic' | 'hybrid'
  offset?: number
  query: string
  status?: 'queued' | 'processing' | 'ready' | 'error'
  tag_ids?: UUID[]
}

/** Search response */
export interface SearchResponse {
  query: string
  results: SearchResult[]
  took_ms: number
  total: number
}

/** Retrieval request (RAG-based search via POST /retrievals) */
export type RetrievalRequest = Schemas.RetrievalRequest

/** Single retrieval result from the RAG endpoint */
export type NoteRetrievalResult = Schemas.NoteRetrievalResult

/** AI-powered search request (via conversation) */
export interface AISearchRequest {
  max_context_notes?: number
  query: string
}

/** AI search response */
export interface AISearchResponse {
  answer: string
  conversation_id: UUID
  referenced_notes: Note[]
}
