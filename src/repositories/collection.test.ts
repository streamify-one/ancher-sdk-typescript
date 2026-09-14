import { describe, expectTypeOf, it } from 'vitest'
import type { Artifact } from '../contracts/artifact'
import type { Page } from '../contracts/common'
import type { Note } from '../contracts/note'
import type { CollectionSuggestion } from '../contracts/suggestion'
import type { CollectionRepository } from './collection'

describe('CollectionRepository', () => {
  it('returns pages with version-compatible embedded notes', () => {
    expectTypeOf<ReturnType<CollectionRepository['notes']>>().toEqualTypeOf<Promise<Page<Note>>>()
    expectTypeOf<ReturnType<CollectionRepository['artifacts']>>().toEqualTypeOf<
      Promise<Page<Artifact>>
    >()
    expectTypeOf<ReturnType<CollectionRepository['suggestedNotes']>>().toEqualTypeOf<
      Promise<Page<CollectionSuggestion>>
    >()
  })
})
