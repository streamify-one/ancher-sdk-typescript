import { describe, expectTypeOf, it } from 'vitest'
import type { CollectionSuggestion, SuggestionBatchResult } from '../contracts/suggestion'
import type { SuggestionRepository } from './suggestion'

describe('SuggestionRepository', () => {
  it('returns batch results with version-compatible embedded suggestions', () => {
    expectTypeOf<ReturnType<SuggestionRepository['acceptMany']>>().toEqualTypeOf<
      Promise<Record<string, SuggestionBatchResult>>
    >()
    expectTypeOf<ReturnType<SuggestionRepository['dismissMany']>>().toEqualTypeOf<
      Promise<Record<string, SuggestionBatchResult>>
    >()
    // Read the field itself: a loosened alias would still satisfy `toExtend`.
    expectTypeOf<SuggestionBatchResult['suggestion']>().toEqualTypeOf<CollectionSuggestion | null>()
  })
})
