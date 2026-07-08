/**
 * TypeScript-native list-query surface.
 *
 * Repositories take a typed `{ where, orderBy, limit, offset } | { cursor }`
 * options object instead of the wire criteria DSL. The `Where` shape is
 * *derived* from the generated OpenAPI criteria types (the element type of a
 * list endpoint's `and` combinator), so each endpoint's exact filter surface —
 * including which fields exist and which relations are filterable — flows
 * through codegen automatically. The runtime translation to the wire DSL lives
 * in `../repositories/query.ts` (`buildListQuery`).
 *
 * Filter vocabulary (compiled to the wire operators — note `lte`/`gte` become
 * the wire's `le`/`ge`):
 *
 * ```ts
 * where: {
 *   status: NoteStatus.Ready,                    // scalar shorthand = equals
 *   reaction: null,                              // null shorthand   = isNull: true
 *   created_at: { gte: new Date('2026-01-01') }, // Date accepted on *_at / *_date fields
 *   title: { ilike: likePattern(searchTerm) },
 *   tags: { id: { in: tagIds } },                // nested relation (endpoints that support it)
 *   OR: [{ title: { ilike: q } }, { description: { ilike: q } }],
 * }
 * ```
 */

/* ---------------------------------------------------------------------------
 * Operator objects, one per criteria kind.
 * ------------------------------------------------------------------------- */

/** Operand accepted wherever the wire expects an ISO datetime string. */
export type DateInput = Date | string

/** Filter for enum-literal fields (wire `ExactCriteria`). */
export interface ExactOps<L> {
  /** `null` means `isNull: true` (the field is unset). */
  equals?: L | null
  /** `null` means `isNull: false` (the field is set). */
  not?: L | null
  in?: L[]
  notIn?: L[]
  isNull?: boolean
}

/** Filter for free-text fields (wire `TextCriteria`). */
export interface TextOps {
  /** `null` means `isNull: true` (the field is unset). */
  equals?: string | null
  /** `null` means `isNull: false` (the field is set). */
  not?: string | null
  in?: string[]
  notIn?: string[]
  lt?: string
  lte?: string
  gt?: string
  gte?: string
  /** Case-sensitive substring match. For case-insensitive use `ilike` + {@link likePattern}. */
  contains?: string
  notContains?: string
  startsWith?: string
  endsWith?: string
  /** Raw SQL LIKE pattern (`%`/`_` are wildcards — escape user input with {@link likePattern}). */
  like?: string
  /** Raw case-insensitive LIKE pattern (`%`/`_` are wildcards — escape user input with {@link likePattern}). */
  ilike?: string
  notLike?: string
  isNull?: boolean
}

/** Filter for numeric fields (wire `NumericCriteria` over int/float). */
export interface NumberOps {
  /** `null` means `isNull: true` (the field is unset). */
  equals?: number | null
  /** `null` means `isNull: false` (the field is set). */
  not?: number | null
  in?: number[]
  notIn?: number[]
  lt?: number
  lte?: number
  gt?: number
  gte?: number
  isNull?: boolean
}

/**
 * Filter for boolean fields. Deliberately narrower than the wire (which also
 * admits `lt`/`in`/… on booleans) — none of those are ever sane.
 */
export interface BoolOps {
  /** `null` means `isNull: true` (the field is unset). */
  equals?: boolean | null
  /** `null` means `isNull: false` (the field is set). */
  not?: boolean | null
  isNull?: boolean
}

/**
 * Filter for datetime fields. Operands take `Date` (serialized to ISO by the
 * translator) or a pre-formatted ISO string. Entity timestamps are Unix
 * *seconds* — convert with `new Date(entity.created_at * 1000)`; a bare number
 * is rejected at compile time.
 */
export interface DateTimeOps {
  /** `null` means `isNull: true` (the field is unset). */
  equals?: DateInput | null
  /** `null` means `isNull: false` (the field is set). */
  not?: DateInput | null
  in?: DateInput[]
  notIn?: DateInput[]
  lt?: DateInput
  lte?: DateInput
  gt?: DateInput
  gte?: DateInput
  isNull?: boolean
}

/** Filter for UUID fields (wire `NumericCriteria` over UUID strings). */
export interface UuidOps {
  /** `null` means `isNull: true` (the field is unset). */
  equals?: string | null
  /** `null` means `isNull: false` (the field is set). */
  not?: string | null
  in?: string[]
  notIn?: string[]
  lt?: string
  lte?: string
  gt?: string
  gte?: string
  isNull?: boolean
}

/* ---------------------------------------------------------------------------
 * Derivation helpers over generated endpoint query types.
 * ------------------------------------------------------------------------- */

/** The criteria branch type of a generated list endpoint query (its `and` element). */
export type BranchOf<TQuery extends { and?: readonly unknown[] | null }> = NonNullable<
  TQuery['and']
>[number]

/** The signed `order_by` literal union of a generated list endpoint query. */
export type OrderByOf<TQuery extends { order_by?: readonly string[] | null }> = NonNullable<
  TQuery['order_by']
>[number]

/** Scalar shorthand = `equals`; `null` shorthand = `isNull: true`. */
export type ExactFilter<L> = L | null | ExactOps<L>
export type TextFilter = string | null | TextOps
export type NumberFilter = number | null | NumberOps
export type BoolFilter = boolean | null | BoolOps
export type DateTimeFilter = DateInput | null | DateTimeOps
export type UuidFilter = string | null | UuidOps

/** Every operator key understood by the translator. */
export type OperatorKey =
  | 'equals'
  | 'not'
  | 'in'
  | 'notIn'
  | 'lt'
  | 'lte'
  | 'gt'
  | 'gte'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'like'
  | 'ilike'
  | 'notLike'
  | 'isNull'

/* ---------------------------------------------------------------------------
 * Where<TBranch> — derived from a generated criteria branch type.
 * ------------------------------------------------------------------------- */

/**
 * Datetime detection: datetime and UUID criteria are structurally identical on
 * the wire (string operands), so datetime fields are recognized by name. This
 * is exhaustively correct for the current API: all 9 datetime criteria fields
 * end in `_at`/`_date`, and none of the 16 UUID fields do. An oddly-named
 * future datetime field degrades gracefully to string-only typing.
 */
type DatetimeKey = `${string}_at` | `${string}_date`

type EqOf<T> = T extends { eq?: infer E } ? NonNullable<E> : never

/** Map one generated criteria field type to its friendly filter type. */
type FieldFilterFor<K extends PropertyKey, T> = 'and' extends keyof T
  ? Where<T>
  : 'contains' extends keyof T
    ? TextFilter
    : 'lt' extends keyof T
      ? [EqOf<T>] extends [boolean]
        ? BoolFilter
        : [EqOf<T>] extends [number]
          ? NumberFilter
          : K extends DatetimeKey
            ? DateTimeFilter
            : UuidFilter
      : ExactFilter<EqOf<T>>

type LogicalWireKeys = 'and' | 'or' | 'not'

/**
 * The branch type `AND`/`OR`/`NOT` recurse into. This is *not* `TBranch`
 * itself: for `GET /notes/` the root branch carries relation fields
 * (`tags`/`article`/…) but its `and`/`or`/`not` elements are the plain
 * criteria without relations — so relation filters are only legal at the root
 * of a `where`, exactly as the wire demands.
 */
type NestedBranchOf<TBranch> = 'and' extends keyof TBranch
  ? NonNullable<TBranch['and']> extends ReadonlyArray<infer E>
    ? E
    : never
  : never

/**
 * The typed `where` for a list endpoint, derived from the endpoint's generated
 * `and`-branch element type. Field keys mirror the entity's wire names;
 * `AND`/`OR`/`NOT` compose sub-criteria.
 */
export type Where<TBranch> = {
  [K in Exclude<keyof TBranch, LogicalWireKeys>]?: FieldFilterFor<K, NonNullable<TBranch[K]>>
} & {
  AND?: Where<NestedBranchOf<TBranch>>[]
  OR?: Where<NestedBranchOf<TBranch>>[]
  /**
   * A single criteria object (matching the wire), not an array. Multi-field
   * `NOT` means *none-of*: `NOT: { a, b }` excludes rows matching `a` and rows
   * matching `b` (¬a ∧ ¬b) — unlike Prisma's object form, which negates the
   * conjunction (¬(a ∧ b)). To negate a conjunction, De Morgan it yourself
   * with per-field negative operators (`OR: [{ a: { not: … } }, …]`) —
   * `NOT: { AND: [...] }` does NOT do it, the wire negates each branch
   * individually.
   */
  NOT?: Where<NestedBranchOf<TBranch>>
}

/** Nested relation criteria types reachable from a branch's fields. */
type RelationBranchesOf<TBranch> = {
  [K in Exclude<keyof TBranch, LogicalWireKeys>]-?: 'and' extends keyof NonNullable<TBranch[K]>
    ? NonNullable<TBranch[K]>
    : never
}[Exclude<keyof TBranch, LogicalWireKeys>]

type FieldsCollide<TBranch> = [
  Extract<Exclude<keyof TBranch, LogicalWireKeys>, OperatorKey>,
] extends [never]
  ? false
  : true

/**
 * Compile-time guard instantiated next to each `Where` export: if a future
 * backend field is ever named like an operator (`in`, `like`, `contains`, …)
 * the translator's object-vs-nested discrimination would misclassify it — this
 * turns that into a typecheck failure on codegen refresh instead. Checks the
 * branch's own fields plus every nested relation criteria reachable from it.
 * (The wire's own `and`/`or`/`not` combinator keys are excluded — they are not
 * fields.)
 */
export type NoOperatorCollision<TBranch> = FieldsCollide<TBranch> extends true
  ? false
  : true extends (
        RelationBranchesOf<TBranch> extends infer R
          ? R extends unknown
            ? FieldsCollide<R>
            : never
          : never
      )
    ? false
    : true

/* ---------------------------------------------------------------------------
 * List options.
 * ------------------------------------------------------------------------- */

/** Sort direction is encoded in the key itself: `'-created_at'` desc, `'+created_at'` asc. */
export type SortKey = `+${string}` | `-${string}`

/** First-page / offset-mode options (no cursor). */
export interface ListFilterOptions<TWhere, TOrderBy extends SortKey = SortKey> {
  cursor?: undefined
  /** Page size (server default when omitted). */
  limit?: number
  offset?: number
  /** Signed sort keys, e.g. `['-updated_at', '-id']`; a single key may be passed bare. */
  orderBy?: TOrderBy | readonly TOrderBy[]
  where?: TWhere
}

/**
 * Continuation-page options. The cursor is opaque and already encodes the
 * page's criteria/order/limit — the API rejects (422) a cursor combined with
 * criteria/order/offset, and `buildListQuery` enforces that client-side.
 * `limit` may accompany a cursor only if it matches what the cursor encodes
 * (the API validates), so re-running the same call with the cursor appended
 * keeps working.
 */
export interface ListCursorOptions {
  cursor: string
  limit?: number
  offset?: undefined
  orderBy?: undefined
  where?: undefined
}

/** Options for a repository `list` call: filters for the first page, or a bare cursor. */
export type ListOptions<TWhere, TOrderBy extends SortKey = SortKey> =
  | ListFilterOptions<TWhere, TOrderBy>
  | ListCursorOptions

/* ---------------------------------------------------------------------------
 * Value helpers.
 * ------------------------------------------------------------------------- */

/**
 * Escape a user-supplied term for `like`/`ilike` substring search: escapes the
 * LIKE wildcards (`%`, `_`) and the escape character (`\`), then wraps in
 * `%…%`. Without this, a user searching `"100%"` gets wildcard semantics.
 *
 * ```ts
 * where: { title: { ilike: likePattern(searchTerm) } }
 * ```
 */
export function likePattern(term: string): string {
  return `%${term.replace(/[\\%_]/g, (match) => `\\${match}`)}%`
}
