import { describe, expect, it } from 'vitest'
import { AncherApiError } from '../api/errors'
import { isEnumValue } from '../contracts/assert'
import { NoteStatus, type NoteListOptions, type NoteWhere } from '../contracts/note'
import { likePattern } from '../contracts/query'
import { createListSurface, type Page } from './base'
import { buildListQuery } from './query'

describe('buildListQuery', () => {
  it('returns an empty query for no options / empty options', () => {
    expect(buildListQuery()).toEqual({})
    expect(buildListQuery({})).toEqual({})
  })

  it('compiles the scalar shorthand to { eq }', () => {
    expect(buildListQuery({ where: { status: 'ready' } })).toEqual({
      and: [{ status: { eq: 'ready' } }],
    })
  })

  it('renames operators to the wire vocabulary (lte/gte become le/ge)', () => {
    expect(
      buildListQuery({
        where: {
          title: { startsWith: 'a', endsWith: 'z', notContains: 'x', notLike: '%y%' },
          created_at: { gte: '2026-01-01', lte: '2026-02-01' },
          id: { notIn: ['u1'], lt: 'u2', gt: 'u0' },
        },
      })
    ).toEqual({
      and: [
        {
          title: { starts_with: 'a', ends_with: 'z', not_contains: 'x', not_like: '%y%' },
          created_at: { ge: '2026-01-01', le: '2026-02-01' },
          id: { not_in: ['u1'], lt: 'u2', gt: 'u0' },
        },
      ],
    })
  })

  it('maps the null shorthands onto is_null and never emits a null operand', () => {
    expect(buildListQuery({ where: { reaction: null } })).toEqual({
      and: [{ reaction: { is_null: true } }],
    })
    expect(buildListQuery({ where: { reaction: { equals: null } } })).toEqual({
      and: [{ reaction: { is_null: true } }],
    })
    expect(buildListQuery({ where: { reaction: { not: null } } })).toEqual({
      and: [{ reaction: { is_null: false } }],
    })
    expect(() => buildListQuery({ where: { created_at: { gt: null } } })).toThrow(
      /null is not a valid operand/
    )
  })

  it('skips undefined at every position', () => {
    expect(
      buildListQuery({
        where: {
          status: undefined,
          title: { ilike: undefined },
          OR: undefined,
        },
        orderBy: undefined,
        limit: undefined,
      })
    ).toEqual({})
  })

  it('serializes Date operands to ISO strings, including inside in/notIn', () => {
    const date = new Date('2026-01-02T03:04:05.000Z')
    expect(
      buildListQuery({
        where: {
          created_at: date,
          updated_at: { gte: date },
          last_accessed_at: { in: [date, '2026-03-01T00:00:00.000Z'] },
        },
      })
    ).toEqual({
      and: [
        {
          created_at: { eq: '2026-01-02T03:04:05.000Z' },
          updated_at: { ge: '2026-01-02T03:04:05.000Z' },
          last_accessed_at: { in: ['2026-01-02T03:04:05.000Z', '2026-03-01T00:00:00.000Z'] },
        },
      ],
    })
  })

  it('omits empty operator objects and an empty where entirely', () => {
    expect(buildListQuery({ where: { created_at: {} } })).toEqual({})
    expect(buildListQuery({ where: {} })).toEqual({})
  })

  it('forwards in: [] verbatim (matches-nothing on the wire)', () => {
    expect(buildListQuery({ where: { id: { in: [] } } })).toEqual({
      and: [{ id: { in: [] } }],
    })
  })

  it('translates AND/OR branches and a single-object NOT', () => {
    expect(
      buildListQuery({
        where: {
          OR: [{ title: { ilike: '%a%' } }, { description: { ilike: '%a%' } }],
          NOT: { status: 'error' },
        },
      })
    ).toEqual({
      and: [
        {
          or: [{ title: { ilike: '%a%' } }, { description: { ilike: '%a%' } }],
          not: { status: { eq: 'error' } },
        },
      ],
    })
  })

  it('throws on empty AND/OR arrays and empty branches', () => {
    expect(() => buildListQuery({ where: { OR: [] } })).toThrow(/ambiguous/)
    expect(() => buildListQuery({ where: { AND: [] } })).toThrow(/ambiguous/)
    expect(() => buildListQuery({ where: { OR: [{}] } })).toThrow(/empty criteria object/)
  })

  it('recurses into nested relation criteria', () => {
    expect(
      buildListQuery({ where: { tags: { id: { in: ['t1', 't2'] }, name: 'rust' } } })
    ).toEqual({
      and: [{ tags: { id: { in: ['t1', 't2'] }, name: { eq: 'rust' } } }],
    })
  })

  it('rejects bare arrays as field values', () => {
    expect(() => buildListQuery({ where: { status: ['ready', 'error'] as never } })).toThrow(
      /\{ in: \[\.\.\.\] \}/
    )
  })

  it('throws on unknown top-level options (stale raw-DSL call sites)', () => {
    expect(() => buildListQuery({ order_by: ['-created_at'] } as never)).toThrow(
      /unknown list option `order_by`/
    )
    expect(() => buildListQuery({ status: { eq: 'ready' } } as never)).toThrow(
      /unknown list option `status`/
    )
  })

  it('throws on raw wire operators inside where (stale raw-DSL field filters)', () => {
    expect(() => buildListQuery({ where: { status: { eq: 'ready' } } as never })).toThrow(
      /`where\.status\.eq` is a raw wire operator/
    )
    expect(() => buildListQuery({ where: { deleted_at: { is_null: true } } as never })).toThrow(
      /`where\.deleted_at\.is_null` is a raw wire operator/
    )
    // Mixed camelCase + wire keys are also stale, not nested relation criteria.
    expect(() =>
      buildListQuery({ where: { status: { eq: 'ready', in: ['ready'] } } as never })
    ).toThrow(/raw wire operator/)
  })

  it('passes a cursor through (optionally with limit) and rejects cursor + criteria/order/offset', () => {
    expect(buildListQuery({ cursor: 'abc' })).toEqual({ cursor: 'abc' })
    // The API accepts a limit alongside a cursor when it matches the cursor's
    // encoded page size — re-running the same call with the cursor appended works.
    expect(buildListQuery({ cursor: 'abc', limit: 10 })).toEqual({ cursor: 'abc', limit: 10 })
    expect(() =>
      buildListQuery({ cursor: 'abc', where: { status: 'ready' } } as never)
    ).toThrow(/cannot be combined with where/)
    expect(() => buildListQuery({ cursor: 'abc', orderBy: '-id' } as never)).toThrow(
      /cannot be combined with orderBy/
    )
    expect(() => buildListQuery({ cursor: 'abc', offset: 5 } as never)).toThrow(
      /cannot be combined with offset/
    )
  })

  it('compiles multi-field NOT to the wire none-of shape (each condition negated individually)', () => {
    expect(
      buildListQuery({ where: { NOT: { status: 'error', is_public: true } } })
    ).toEqual({
      and: [{ not: { status: { eq: 'error' }, is_public: { eq: true } } }],
    })
  })

  it('normalizes orderBy to an array of signed keys and passes pagination through', () => {
    expect(buildListQuery({ orderBy: '-created_at', limit: 20, offset: 40 })).toEqual({
      order_by: ['-created_at'],
      limit: 20,
      offset: 40,
    })
    expect(buildListQuery({ orderBy: ['-updated_at', '-id'] })).toEqual({
      order_by: ['-updated_at', '-id'],
    })
    expect(buildListQuery({ orderBy: [] })).toEqual({})
  })
})

describe('likePattern', () => {
  it('escapes LIKE wildcards and wraps in %', () => {
    expect(likePattern('rust')).toBe('%rust%')
    expect(likePattern('100%')).toBe('%100\\%%')
    expect(likePattern('a_b')).toBe('%a\\_b%')
    expect(likePattern('back\\slash')).toBe('%back\\\\slash%')
  })
})

describe('isEnumValue', () => {
  it('narrows valid values and rejects everything else', () => {
    expect(isEnumValue(NoteStatus, 'ready')).toBe(true)
    expect(isEnumValue(NoteStatus, 'archived')).toBe(false)
    expect(isEnumValue(NoteStatus, 42)).toBe(false)
    expect(isEnumValue(NoteStatus, undefined)).toBe(false)
  })
})

describe('createListSurface', () => {
  interface Item {
    id: number
  }

  function pages(...sequence: Page<Item>[]) {
    const calls: unknown[] = []
    let call = 0
    const surface = createListSurface<Item, { id?: number }, '-id' | '+id'>((query) => {
      calls.push(query)
      const page = sequence[call]
      call += 1
      if (!page) throw new Error('fetched past the last page')
      return Promise.resolve(page)
    })
    return { surface, calls }
  }

  it('list compiles options through buildListQuery', async () => {
    const { surface, calls } = pages({ items: [], has_more: false, next_cursor: 'end' })
    await surface.list({ where: { id: 1 }, limit: 5 })
    expect(calls).toEqual([{ and: [{ id: { eq: 1 } }], limit: 5 }])
  })

  it('count reads total from a limit-1 page and defaults to 0', async () => {
    const { surface } = pages({ items: [{ id: 1 }], has_more: true, next_cursor: 'c', total: 42 })
    expect(await surface.count({ id: 1 })).toBe(42)

    const { surface: noTotal } = pages({ items: [], has_more: false, next_cursor: 'end' })
    expect(await noTotal.count()).toBe(0)
  })

  it('iterate follows cursors alone and stops on has_more=false despite a present next_cursor', async () => {
    const { surface, calls } = pages(
      { items: [{ id: 1 }, { id: 2 }], has_more: true, next_cursor: 'c1' },
      // Final page still carries a next_cursor — the API always mints one.
      { items: [{ id: 3 }], has_more: false, next_cursor: 'c2' }
    )
    const seen: number[] = []
    for await (const item of surface.iterate({ limit: 2 })) seen.push(item.id)
    expect(seen).toEqual([1, 2, 3])
    expect(calls).toEqual([{ limit: 2 }, { cursor: 'c1' }])
  })

  it('iterate is lazy: break stops fetching further pages', async () => {
    const { surface, calls } = pages({
      items: [{ id: 1 }, { id: 2 }],
      has_more: true,
      next_cursor: 'c1',
    })
    for await (const item of surface.iterate()) {
      if (item.id === 1) break
    }
    expect(calls).toHaveLength(1)
  })

  /**
   * Reproduce the `undefined` the generated client resolves for a 2xx body it
   * can't parse — it types the call as returning a non-nullable `Page`, so the
   * cast is exactly the lie the guard exists to catch.
   */
  function absentPageSurface() {
    return createListSurface<Item, { id?: number }, '-id' | '+id'>(() =>
      Promise.resolve(undefined as unknown as Page<Item>)
    )
  }

  it('list rejects rather than passing an absent page to the caller', async () => {
    // Left to propagate, this only threw where a caller first read a field —
    // for an infinite query, `has_more` during a React render (VITA-1216).
    await expect(absentPageSurface().list()).rejects.toBeInstanceOf(AncherApiError)
  })

  it('count rejects on an absent page instead of reporting 0', async () => {
    await expect(absentPageSurface().count()).rejects.toBeInstanceOf(AncherApiError)
  })

  it('iterate rejects on an absent page instead of yielding nothing', async () => {
    const drain = async () => {
      const seen: number[] = []
      for await (const item of absentPageSurface().iterate()) seen.push(item.id)
      return seen
    }
    await expect(drain()).rejects.toBeInstanceOf(AncherApiError)
  })
})

/* ---------------------------------------------------------------------------
 * Compile-time pins (checked by `pnpm typecheck`; nothing runs).
 * ------------------------------------------------------------------------- */

// A representative valid where must compile.
const _validWhere: NoteWhere = {
  status: NoteStatus.Ready,
  reaction: null,
  created_at: { gte: new Date() },
  title: { ilike: likePattern('term') },
  tags: { id: { in: ['t1'] } },
  OR: [{ title: { ilike: '%q%' } }, { description: { ilike: '%q%' } }],
  NOT: { status: 'error' },
}

// @ts-expect-error — unknown field names are rejected.
const _unknownField: NoteWhere = { bogus_field: 'x' }

// @ts-expect-error — invalid enum values are rejected.
const _invalidEnumValue: NoteWhere = { status: 'archived' }

// @ts-expect-error — operators must match the field kind (no ilike on datetime).
const _wrongOperatorKind: NoteWhere = { created_at: { ilike: '%x%' } }

// @ts-expect-error — Date is not accepted on text fields.
const _dateOnTextField: NoteWhere = { title: new Date() }

// @ts-expect-error — entity timestamps are Unix seconds; datetime operands take Date/ISO string.
const _numberOnDatetime: NoteWhere = { created_at: { gt: 12345 } }

// @ts-expect-error — relation criteria are only legal at the root, not inside OR.
const _relationInsideOr: NoteWhere = { OR: [{ tags: { id: { in: ['t'] } } }] }

// A continuation cursor may carry a matching limit (re-run-same-call idiom)…
const _cursorPlusLimit: NoteListOptions = { cursor: 'abc', limit: 20 }

// @ts-expect-error — …but never criteria or ordering.
const _cursorPlusWhere: NoteListOptions = { cursor: 'abc', where: { status: 'ready' } }

// Reference the pins so they are "used" without emitting anything.
export type _CompileTimePins = [
  typeof _validWhere,
  typeof _unknownField,
  typeof _invalidEnumValue,
  typeof _wrongOperatorKind,
  typeof _dateOnTextField,
  typeof _numberOnDatetime,
  typeof _relationInsideOr,
  typeof _cursorPlusLimit,
  typeof _cursorPlusWhere,
]
