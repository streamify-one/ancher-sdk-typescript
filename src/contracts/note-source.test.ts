import { describe, expect, it } from 'vitest'
import {
  getNoteAuthor,
  getNoteErrorMessage,
  getNoteLanguage,
  getNoteProcessingStatus,
  getNotePublishedDate,
  getNoteSiteName,
  getNoteSource,
  getNoteSourceUrl,
  getNoteTitle,
  getNoteDescription,
} from './note-source'

/** (A) API ≤ v1.4 — provenance lives on the nested article. */
const shapeA = {
  source: 'text', // the stale literal default the old note field could carry
  status: 'ready',
  article: {
    author: 'Ada',
    error_message: null,
    language: 'en',
    published_date: '2026-01-02T00:00:00Z',
    site_name: 'Example',
    source: 'web',
    status: 'ready',
    url: 'https://example.com/a',
  },
}
/** (C) v1.5.0 — hoisted onto the note, article hidden. */
const shapeC = {
  author: 'Ada',
  error_message: null,
  language: 'en',
  published_date: '2026-01-02T00:00:00Z',
  site_name: 'Example',
  source: 'web',
  status: 'ready',
  url: 'https://example.com/a',
  article: null,
}

describe('note source fields across API shapes', () => {
  it('reads the same values from the hoisted fields and from the nested article', () => {
    for (const note of [shapeA, shapeC]) {
      expect(getNoteSourceUrl(note)).toBe('https://example.com/a')
      expect(getNoteSiteName(note)).toBe('Example')
      expect(getNoteAuthor(note)).toBe('Ada')
      expect(getNotePublishedDate(note)).toBe('2026-01-02T00:00:00Z')
      expect(getNoteLanguage(note)).toBe('en')
    }
  })

  it('prefers the note-level value and normalizes null to undefined', () => {
    expect(getNoteSourceUrl({ url: 'https://note', article: { url: 'https://article' } })).toBe('https://note')
    expect(getNoteSourceUrl({ url: null, article: { url: 'https://article' } })).toBe('https://article')
    expect(getNoteSourceUrl({ url: null, article: { url: null } })).toBeUndefined()
    expect(getNoteSourceUrl({})).toBeUndefined()
    expect(getNoteSourceUrl(null)).toBeUndefined()
    expect(getNoteSourceUrl(undefined)).toBeUndefined()
  })

  it('reads source article-first, past the legacy note-level default', () => {
    expect(getNoteSource(shapeA)).toBe('web')
    expect(getNoteSource({ source: 'file', article: null })).toBe('file')
    expect(getNoteSource({ source: 'text', article: { source: null } })).toBe('text')
    expect(getNoteSource(shapeC)).toBe('web')
  })

  it('derives flattened v1.5 platform provenance from the hoisted URL', () => {
    expect(
      getNoteSource({
        article: null,
        source: 'url',
        url: 'https://www.youtube.com/watch?v=demo',
      })
    ).toBe('youtube')
    expect(getNoteSource({ article: null, source: 'url', url: 'https://example.com' })).toBe('url')
  })

  it('derives flattened v1.5 upload provenance from every origin file', () => {
    expect(
      getNoteSource({
        article: null,
        source: 'file',
        origin_files: [{ filename: 'photo.png', mimetype: 'image/png' }],
      })
    ).toBe('image')
    expect(
      getNoteSource({
        article: null,
        source: 'file',
        origin_files: [
          { filename: 'photo.png', mimetype: 'image/png' },
          { filename: 'report.pdf', mimetype: 'application/pdf' },
        ],
      })
    ).toBe('mixed')
    expect(
      getNoteSource({
        article: null,
        source: 'file',
        origin_files: [{ filename: 'recording.m4a', mimetype: 'video/mp4' }],
      })
    ).toBe('video')
  })

  it('normalizes flattened text-backed creation channels', () => {
    expect(getNoteSource({ article: null, source: 'conversation' })).toBe('text')
    expect(getNoteSource({ article: null, source: 'message' })).toBe('text')
    expect(getNoteSource({ article: null, source: 'artifact' })).toBe('text')
  })

  it('reads the error message note-first, then from the article', () => {
    expect(getNoteErrorMessage({ error_message: 'note', article: { error_message: 'article' } })).toBe('note')
    expect(getNoteErrorMessage({ error_message: null, article: { error_message: 'article' } })).toBe('article')
    expect(getNoteErrorMessage(shapeC)).toBeUndefined()
  })
})

describe('title / description', () => {
  it('reads the override-resolved values note-first, then the article', () => {
    expect(getNoteTitle({ title: 'Mine', article: { title: 'Scraped' } })).toBe('Mine')
    expect(getNoteTitle({ title: null, article: { title: 'Scraped' } })).toBe('Scraped')
    expect(getNoteDescription({ description: null, article: { description: 'From article' } })).toBe('From article')
    expect(getNoteDescription({ description: 'Own', article: null })).toBe('Own')
    expect(getNoteTitle({})).toBeUndefined()
  })
})

describe('getNotePublishedDate', () => {
  it('returns the wire value as received (Unix seconds, not an ISO string)', () => {
    expect(getNotePublishedDate({ published_date: 1743552000 })).toBe(1743552000)
    expect(getNotePublishedDate({ published_date: null, article: { published_date: '2026-01-02T00:00:00Z' } })).toBe('2026-01-02T00:00:00Z')
    expect(getNotePublishedDate({})).toBeUndefined()
  })
})

describe('getNoteProcessingStatus', () => {
  it('lets an article still processing win over a ready note (≤ v1.4)', () => {
    expect(getNoteProcessingStatus({ status: 'ready', article: { status: 'queued' } })).toBe('queued')
    expect(getNoteProcessingStatus({ status: 'ready', article: { status: 'processing' } })).toBe('processing')
  })

  it("reads the note's own pending state before the article's", () => {
    expect(getNoteProcessingStatus({ status: 'queued', article: { status: 'processing' } })).toBe('queued')
  })

  it('reports error when either side failed', () => {
    expect(getNoteProcessingStatus({ status: 'ready', article: { status: 'error' } })).toBe('error')
    expect(getNoteProcessingStatus({ status: 'error', article: { status: 'ready' } })).toBe('error')
  })

  it('is the note status alone once the article is hidden (v1.5.0)', () => {
    expect(getNoteProcessingStatus({ status: 'processing', article: null })).toBe('processing')
    expect(getNoteProcessingStatus({ status: 'ready' })).toBe('ready')
    expect(getNoteProcessingStatus(null)).toBeUndefined()
  })
})
