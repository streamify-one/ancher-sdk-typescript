/**
 * Shared pagination type + the list-surface factory used by every repository
 * that fronts a criteria list endpoint.
 */

import type { ListFilterOptions, ListOptions, SortKey } from '../contracts/query'
import { buildListQuery, type WireListQuery } from './query'

/**
 * Standard API page. Mirrors the generated `Page_X_` shape with an upgraded
 * generic `items`, so `sdk.X.list()` returns `Page<X>` over the friendly
 * entity type.
 *
 * `next_cursor` is present even on the final page — test `has_more`, not the
 * cursor, to decide whether to continue (or use `iterate`, which does).
 */
export interface Page<T> {
  has_more: boolean
  items: T[]
  next_cursor: string | null
  total?: number
}

/** The typed list surface every criteria list endpoint exposes. */
export interface ListSurface<TEntity, TWhere extends object, TOrderBy extends SortKey> {
  /**
   * Fetch one page. Pass filters for the first page, or `{ cursor }` — alone —
   * for a continuation page.
   */
  list(options?: ListOptions<TWhere, TOrderBy>): Promise<Page<TEntity>>
  /** Count matching records (a `limit: 1` list reading `total`). */
  count(where?: TWhere): Promise<number>
  /**
   * Lazily iterate matching items across pages. Pages are fetched as consumed,
   * so `break` stops network traffic; `limit` is the per-page fetch size.
   *
   * ```ts
   * for await (const note of sdk.Note.iterate({ where: { status: NoteStatus.Ready } })) { … }
   * ```
   */
  iterate(options?: ListFilterOptions<TWhere, TOrderBy>): AsyncGenerator<TEntity, void, undefined>
}

/**
 * Build a {@link ListSurface} over a page fetcher. The fetcher owns the
 * endpoint call (path params bound in its closure) and receives the compiled
 * wire query.
 */
export function createListSurface<TEntity, TWhere extends object, TOrderBy extends SortKey>(
  fetchPage: (query: WireListQuery) => Promise<Page<TEntity>>
): ListSurface<TEntity, TWhere, TOrderBy> {
  const list = (options?: ListOptions<TWhere, TOrderBy>): Promise<Page<TEntity>> =>
    fetchPage(buildListQuery(options))

  return {
    list,

    async count(where?: TWhere): Promise<number> {
      const page = await list({ where, limit: 1 })
      return page.total ?? 0
    },

    async *iterate(
      options?: ListFilterOptions<TWhere, TOrderBy>
    ): AsyncGenerator<TEntity, void, undefined> {
      let page = await list(options ?? {})
      for (;;) {
        yield* page.items
        // The API mints a next_cursor even on the final page — `has_more` is
        // the only sound termination signal.
        if (!page.has_more || page.next_cursor === null) return
        page = await list({ cursor: page.next_cursor })
      }
    },
  }
}
