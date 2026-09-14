import { describe, expect, expectTypeOf, it } from 'vitest'
import { getArtifactFileId, type Artifact } from './artifact'

const base = { id: 'a1', name: 'Deck' } as unknown as Artifact

describe('getArtifactFileId', () => {
  it('keeps intermediate file-reference sizes nullable', () => {
    type EmbeddedFile = NonNullable<NonNullable<Artifact['file_ref']>['file']>
    expectTypeOf<EmbeddedFile['size']>().toEqualTypeOf<number | null>()
  })

  it('reads the typed content slot first (v1.5.0, where content_file_id is deprecated and nullable)', () => {
    expect(getArtifactFileId({ ...base, content_file: { id: 'slot' }, content_file_id: null } as Artifact)).toBe('slot')
  })

  it('falls back to the live file_ref / file_id pair, then the legacy id', () => {
    expect(getArtifactFileId({ ...base, file_ref: { file_id: 'ref' } } as unknown as Artifact)).toBe('ref')
    expect(getArtifactFileId({ ...base, file_id: 'live' } as Artifact)).toBe('live')
    expect(getArtifactFileId({ ...base, content_file_id: 'legacy' } as Artifact)).toBe('legacy')
    expect(getArtifactFileId({ ...base, content_file_id: null } as Artifact)).toBeUndefined()
    expect(getArtifactFileId(null)).toBeUndefined()
  })
})
