import { describe, expect, it } from 'vitest'
import {
  getArtifactContentFile,
  getArtifactDisplayFile,
  getArtifactThumbnailFile,
  getFileContentKey,
  getFileMimetype,
  getFileRevisionNumber,
  getFileUrl,
  getNoteContentFile,
  getNoteDisplayFile,
  getNoteOriginFiles,
  getNoteOwnContentFile,
  getNoteThumbnailFile,
  getNoteTldrFile,
  getNoteTranscriptFile,
  type SlotFile,
} from './file-slots'

function file(id: string, extra: Partial<SlotFile> = {}): SlotFile {
  return { id, ...extra }
}

// The three payload shapes the accessors must agree on.
const noteContent = file('note-content', { mimetype: 'text/markdown' })
const articleContent = file('article-content', { mimetype: 'text/markdown' })
const origin = file('origin', { mimetype: 'application/pdf' })

/** (A) API ≤ v1.4 — `files` maps on note and nested article. */
const shapeA = {
  files: { content: noteContent, thumbnail: file('note-thumb', { presigned_url: 'https://cdn/t' }) },
  article: { files: { content: articleContent, display: file('article-display') }, origin_files: [origin] },
}
/** (A′) only the article carries files (e.g. a freshly created note). */
const shapeAArticleOnly = {
  files: {},
  article: { files: { content: articleContent, thumbnail: file('article-thumb') }, origin_files: [origin] },
}
/** (B) v1.5.0 — typed slots; `files` is a deprecated computed map of the same. */
const shapeB = {
  content_file: noteContent,
  thumbnail_file: file('note-thumb', { presigned_url: 'https://cdn/t' }),
  files: { content: noteContent, thumbnail: file('note-thumb', { presigned_url: 'https://cdn/t' }) },
  article: { content_file: articleContent, display_file: file('article-display'), origin_files: [origin] },
}
/** (B′) typed slots only — the deprecated map already dropped. */
const shapeBTypedOnly = {
  content_file: noteContent,
  content_tldr_file: file('tldr', { presigned_url: 'https://cdn/tldr' }),
  article: { display_file: file('article-display'), origin_files: [origin] },
}
/** (C) after VITA-1065 — article hidden, origin files hoisted onto the note. */
const shapeC = {
  content_file: noteContent,
  display_file: file('note-display'),
  origin_files: [origin],
  article: null,
}

describe('note slots across API shapes', () => {
  it.each([
    ['A', shapeA],
    ['B', shapeB],
    ['B typed-only', shapeBTypedOnly],
    ['C flattened', shapeC],
  ])('resolves the note-owned content file first (%s)', (_, note) => {
    expect(getNoteContentFile(note)?.id).toBe('note-content')
    expect(getNoteOwnContentFile(note)?.id).toBe('note-content')
  })

  it('falls back to the article content file, but never for the own-content read', () => {
    expect(getNoteContentFile(shapeAArticleOnly)?.id).toBe('article-content')
    expect(getNoteOwnContentFile(shapeAArticleOnly)).toBeUndefined()
  })

  it('prefers a typed slot over the deprecated files map when both are present', () => {
    const note = { content_file: file('typed'), files: { content: file('mapped') } }
    expect(getNoteContentFile(note)?.id).toBe('typed')
  })

  it('falls through a null typed slot to the map, and normalizes null map values to undefined', () => {
    expect(getNoteContentFile({ content_file: null, files: { content: file('mapped') } })?.id).toBe('mapped')
    expect(getNoteContentFile({ files: { content: null } })).toBeUndefined()
    expect(getNoteContentFile({ content_file: null, files: { content: null } })).toBeUndefined()
  })

  it('resolves the display file from note then article in every shape', () => {
    expect(getNoteDisplayFile(shapeA)?.id).toBe('article-display')
    expect(getNoteDisplayFile(shapeBTypedOnly)?.id).toBe('article-display')
    expect(getNoteDisplayFile(shapeC)?.id).toBe('note-display')
  })

  it('resolves the TLDR file note-first', () => {
    expect(getNoteTldrFile(shapeBTypedOnly)?.id).toBe('tldr')
    expect(getNoteTldrFile({ article: { files: { content_tldr: file('a-tldr') } } })?.id).toBe('a-tldr')
    expect(getNoteTldrFile(shapeA)).toBeUndefined()
  })

  it('returns origin files from the note once hoisted, else from the article, else empty', () => {
    expect(getNoteOriginFiles(shapeC)).toEqual([origin])
    expect(getNoteOriginFiles(shapeA)).toEqual([origin])
    expect(getNoteOriginFiles({ article: null })).toEqual([])
    expect(getNoteOriginFiles(undefined)).toEqual([])
  })

  it('prefers the note-level origin files over the article ones and returns a copy', () => {
    const hoisted = [file('hoisted')]
    const note = { origin_files: hoisted, article: { origin_files: [origin] } }
    const result = getNoteOriginFiles(note)
    expect(result).toEqual(hoisted)
    expect(result).not.toBe(hoisted)
  })

  it('reads the transcript slot when a payload carries one (no version does yet)', () => {
    expect(getNoteTranscriptFile(shapeA)).toBeUndefined()
    expect(getNoteTranscriptFile({ article: { transcript_file: file('tr') } })?.id).toBe('tr')
  })

  it('tolerates null and undefined inputs', () => {
    expect(getNoteContentFile(null)).toBeUndefined()
    expect(getNoteThumbnailFile(undefined)).toBeUndefined()
    expect(getNoteContentFile({ files: null, article: null })).toBeUndefined()
  })
})

describe('getNoteThumbnailFile', () => {
  const signedImage = file('img', { mimetype: 'image/png', presigned_url: 'https://cdn/img' })

  it('takes whichever thumbnail slot carries a signed URL, note before article', () => {
    expect(getNoteThumbnailFile(shapeA)?.id).toBe('note-thumb')
    const articleSigned = {
      files: { thumbnail: file('note-thumb') },
      article: { files: { thumbnail: file('article-thumb', { presigned_url: 'https://cdn/a' }) } },
    }
    expect(getNoteThumbnailFile(articleSigned)?.id).toBe('article-thumb')
  })

  it('falls back to a signed image content file when no thumbnail is signed', () => {
    expect(getNoteThumbnailFile({ files: { content: signedImage } })?.id).toBe('img')
    expect(getNoteThumbnailFile({ article: { files: { content: signedImage } } })?.id).toBe('img')
    // An unsigned thumbnail slot loses to a signed image content file …
    expect(
      getNoteThumbnailFile({ files: { thumbnail: file('unsigned-thumb'), content: signedImage } })?.id
    ).toBe('img')
  })

  it('still returns the unsigned thumbnail slot when nothing is signed', () => {
    const unsignedImage = file('img', { mimetype: 'image/png' })
    expect(
      getNoteThumbnailFile({ files: { thumbnail: file('unsigned-thumb'), content: unsignedImage } })?.id
    ).toBe('unsigned-thumb')
    expect(getNoteThumbnailFile(shapeAArticleOnly)?.id).toBe('article-thumb')
  })

  it('falls back last to any image in the note map (generated files on API ≤ v1.4)', () => {
    const generated = file('gen', { mimetype: 'image/png' })
    const note = { files: { content: file('md', { mimetype: 'text/markdown' }), generated } }
    expect(getNoteThumbnailFile(note)?.id).toBe('gen')
    // …but an unsigned thumbnail slot still wins over it, and the article map is not scanned.
    expect(getNoteThumbnailFile({ files: { thumbnail: file('t'), generated } })?.id).toBe('t')
    expect(getNoteThumbnailFile({ article: { files: { generated } } })).toBeUndefined()
  })

  it('takes the note thumbnail when both note and article thumbnails are signed', () => {
    const both = {
      files: { thumbnail: file('n', { presigned_url: 'https://cdn/n' }) },
      article: { files: { thumbnail: file('a', { presigned_url: 'https://cdn/a' }) } },
    }
    expect(getNoteThumbnailFile(both)?.id).toBe('n')
  })

  it('takes the note thumbnail when both are unsigned', () => {
    const both = { files: { thumbnail: file('n') }, article: { files: { thumbnail: file('a') } } }
    expect(getNoteThumbnailFile(both)?.id).toBe('n')
  })

  it('never returns a non-image content file as a thumbnail', () => {
    const signedMarkdown = file('md', { mimetype: 'text/markdown', presigned_url: 'https://cdn/md' })
    expect(getNoteThumbnailFile({ files: { content: signedMarkdown } })).toBeUndefined()
  })
})

describe('artifact slots', () => {
  it('resolves content / display / thumbnail from the files map and from typed slots', () => {
    const mapped = { files: { content: file('c'), display: file('d'), thumbnail: file('t') } }
    const typed = { content_file: file('c'), display_file: file('d'), thumbnail_file: file('t') }
    for (const artifact of [mapped, typed]) {
      expect(getArtifactContentFile(artifact)?.id).toBe('c')
      expect(getArtifactDisplayFile(artifact)?.id).toBe('d')
      expect(getArtifactThumbnailFile(artifact)?.id).toBe('t')
    }
  })

  it('falls back from thumbnail to display, like the presign rule', () => {
    expect(getArtifactThumbnailFile({ files: { display: file('d') } })?.id).toBe('d')
    expect(getArtifactThumbnailFile({ files: {} })).toBeUndefined()
  })

  it('can return the bare thumbnail slot without the display fallback', () => {
    const artifact = { files: { display: file('d') } }
    expect(getArtifactThumbnailFile(artifact, { displayFallback: false })).toBeUndefined()
    expect(getArtifactThumbnailFile({ files: { thumbnail: file('t'), display: file('d') } }, { displayFallback: false })?.id).toBe('t')
    expect(getArtifactContentFile(null)).toBeUndefined()
  })
})

describe('file-level reads', () => {
  it('getFileUrl returns the signed URL or undefined', () => {
    expect(getFileUrl(file('f', { presigned_url: 'https://cdn/f' }))).toBe('https://cdn/f')
    expect(getFileUrl(file('f', { presigned_url: null }))).toBeUndefined()
    expect(getFileUrl(undefined)).toBeUndefined()
  })

  it('getFileMimetype returns the type or null', () => {
    expect(getFileMimetype(file('f', { mimetype: 'image/png' }))).toBe('image/png')
    expect(getFileMimetype(file('f'))).toBeNull()
    expect(getFileMimetype(null)).toBeNull()
  })

  it('getFileRevisionNumber reads the nested revision, or the flattened number once revision is hidden', () => {
    expect(getFileRevisionNumber(file('f', { revision: { revision_number: 3 } }))).toBe(3)
    expect(getFileRevisionNumber(file('f', { revision_number: 4 }))).toBe(4)
    expect(getFileRevisionNumber(file('f', { revision_number: 5, revision: { revision_number: 3 } }))).toBe(5)
    expect(getFileRevisionNumber(file('f', { revision: null }))).toBeUndefined()
    expect(getFileRevisionNumber(undefined)).toBeUndefined()
  })

  it('getFileContentKey changes with the bytes, not with the URL, and fails closed without a hash', () => {
    const v1 = file('f', { content_hash: 'aaa', presigned_url: 'https://cdn/1' })
    const resigned = file('f', { content_hash: 'aaa', presigned_url: 'https://cdn/2' })
    const rewritten = file('f', { content_hash: 'bbb' })
    expect(getFileContentKey(v1)).toBe('f:aaa')
    expect(getFileContentKey(resigned)).toBe(getFileContentKey(v1))
    expect(getFileContentKey(rewritten)).not.toBe(getFileContentKey(v1))
    expect(getFileContentKey(file('f'))).toBeUndefined()
    expect(getFileContentKey({ id: '', content_hash: 'aaa' })).toBeUndefined()
    expect(getFileContentKey(null)).toBeUndefined()
  })
})
