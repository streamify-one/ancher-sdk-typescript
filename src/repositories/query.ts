/**
 * Runtime translation from the TypeScript-native list options
 * (`{ where, orderBy, limit, offset } | { cursor }`, typed in
 * `../contracts/query`) to the wire criteria DSL the generated client sends.
 *
 * Wire facts this encodes (verified against the API implementation):
 * - A root `where` compiles to a single `and: [criteria]` wrapper — the
 *   backend expands `and` branches into the identical expression tree as
 *   flattened per-field params, on every list endpoint.
 * - Bare scalars are rejected by the API; the scalar shorthand MUST compile to
 *   `{ eq: … }`.
 * - A `null` operand is silently dropped server-side (the filter vanishes and
 *   the list comes back unfiltered) — so `null` never reaches the wire: the
 *   null shorthands compile to `is_null`, and any other `null` operand throws.
 * - `in: []` is meaningful (matches nothing) and is forwarded verbatim;
 *   `AND: []`/`OR: []` would silently match everything (Prisma's is the
 *   opposite), so they throw instead.
 * - A continuation cursor is opaque and already encodes criteria/order/limit;
 *   combining it with criteria/order/offset is a 422 — enforced here
 *   client-side. `limit` is allowed alongside a cursor (the API accepts it
 *   when it matches the cursor's encoded page size, e.g. re-running the same
 *   call with the cursor appended).
 */

import type { OperatorKey } from '../contracts/query'

/** camelCase operator → wire operator (note `lte`/`gte` → `le`/`ge`). */
const OPERATOR_TO_WIRE: Record<OperatorKey, string> = {
  equals: 'eq',
  not: 'ne',
  in: 'in',
  notIn: 'not_in',
  lt: 'lt',
  lte: 'le',
  gt: 'gt',
  gte: 'ge',
  contains: 'contains',
  notContains: 'not_contains',
  startsWith: 'starts_with',
  endsWith: 'ends_with',
  like: 'like',
  ilike: 'ilike',
  notLike: 'not_like',
  isNull: 'is_null',
}

/**
 * Wire operator names that are NOT also camelCase operators (`eq`, `ne`,
 * `is_null`, `le`, …). Their presence inside a `where` field marks a stale
 * raw-DSL call site (e.g. `{ status: { eq: 'ready' } }` from untyped JS) that
 * would otherwise be misread as nested relation criteria and serialized
 * incorrectly — detected in `translateFieldFilter` and rejected loudly.
 */
const WIRE_ONLY_OPERATORS = new Set(
  Object.values(OPERATOR_TO_WIRE).filter((op) => !(op in OPERATOR_TO_WIRE))
)

const KNOWN_OPTION_KEYS = new Set(['where', 'orderBy', 'limit', 'offset', 'cursor'])

type UnknownRecord = Record<string, unknown>

/**
 * The wire query params shape all criteria list endpoints share. A type alias
 * (not an interface) so it gets an implicit index signature and stays
 * assignable at the generated-client boundary.
 */
export type WireListQuery = {
  and?: UnknownRecord[]
  cursor?: string
  limit?: number
  offset?: number
  order_by?: string[]
}

function serializeScalar(value: unknown): unknown {
  return value instanceof Date ? value.toISOString() : value
}

/** An object value is an operator object iff every key is a known operator. */
function isOperatorObject(value: UnknownRecord): boolean {
  const keys = Object.keys(value)
  return keys.length > 0 && keys.every((key) => key in OPERATOR_TO_WIRE)
}

function translateOperators(fieldPath: string, ops: UnknownRecord): UnknownRecord | undefined {
  const out: UnknownRecord = {}
  for (const [op, operand] of Object.entries(ops)) {
    if (operand === undefined) continue
    if (operand === null) {
      // Prisma-style null shorthands; anything else must never reach the wire.
      if (op === 'equals') {
        out.is_null = true
      } else if (op === 'not') {
        out.is_null = false
      } else {
        throw new TypeError(
          `null is not a valid operand for \`${fieldPath}.${op}\` — use \`isNull\` to filter on null-ness`
        )
      }
      continue
    }
    const wireOp = OPERATOR_TO_WIRE[op as OperatorKey]
    out[wireOp] = Array.isArray(operand) ? operand.map(serializeScalar) : serializeScalar(operand)
  }
  return Object.keys(out).length > 0 ? out : undefined
}

function translateFieldFilter(fieldPath: string, value: unknown): unknown {
  if (value === null) return { is_null: true }
  if (value instanceof Date) return { eq: value.toISOString() }
  if (Array.isArray(value)) {
    throw new TypeError(
      `bare array for \`${fieldPath}\` — write \`{ in: [...] }\` for membership filters`
    )
  }
  if (typeof value === 'object') {
    const obj = value as UnknownRecord
    if (isOperatorObject(obj)) return translateOperators(fieldPath, obj)
    const wireKey = Object.keys(obj).find((key) => WIRE_ONLY_OPERATORS.has(key))
    if (wireKey !== undefined) {
      throw new TypeError(
        `\`${fieldPath}.${wireKey}\` is a raw wire operator — the criteria DSL is no longer ` +
          'accepted; use the camelCase operators (`eq` → `equals`, `ne` → `not`, ' +
          '`is_null` → `isNull`, …)'
      )
    }
    // Nested relation criteria (e.g. `tags: { id: { in: [...] } }`).
    return translateWhere(fieldPath, obj)
  }
  return { eq: value }
}

function translateBranches(fieldPath: string, branches: unknown): UnknownRecord[] {
  if (!Array.isArray(branches)) {
    throw new TypeError(`\`${fieldPath}\` expects an array of criteria objects`)
  }
  if (branches.length === 0) {
    throw new TypeError(
      `\`${fieldPath}: []\` is ambiguous (the API would apply no constraint) — omit the key instead`
    )
  }
  return branches.map((branch, index) => {
    const translated = translateWhere(`${fieldPath}[${index}]`, branch as UnknownRecord)
    if (translated === undefined) {
      throw new TypeError(`\`${fieldPath}[${index}]\` is an empty criteria object`)
    }
    return translated
  })
}

/** Translate a `where` object; returns `undefined` when it constrains nothing. */
function translateWhere(fieldPath: string, where: UnknownRecord): UnknownRecord | undefined {
  const out: UnknownRecord = {}
  for (const [key, value] of Object.entries(where)) {
    if (value === undefined) continue
    if (key === 'AND' || key === 'OR') {
      out[key === 'AND' ? 'and' : 'or'] = translateBranches(`${fieldPath}.${key}`, value)
      continue
    }
    if (key === 'NOT') {
      if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        throw new TypeError(`\`${fieldPath}.NOT\` expects a single criteria object`)
      }
      const translated = translateWhere(`${fieldPath}.NOT`, value as UnknownRecord)
      if (translated !== undefined) out.not = translated
      continue
    }
    const translated = translateFieldFilter(`${fieldPath}.${key}`, value)
    if (translated !== undefined) out[key] = translated
  }
  return Object.keys(out).length > 0 ? out : undefined
}

/**
 * The loosest options shape the translator accepts — every typed
 * `ListOptions<TWhere, TOrderBy>` instantiation is assignable to it, so the
 * repository factory stays generic without casts.
 */
export interface AnyListOptions {
  cursor?: string | undefined
  limit?: number | undefined
  offset?: number | undefined
  orderBy?: string | readonly string[] | undefined
  where?: object | undefined
}

/**
 * Compile typed list options into the wire query params object.
 *
 * Throws `TypeError` on inputs that would otherwise fail at the API or —
 * worse — silently return wrong data: unknown option keys (e.g. stale raw-DSL
 * params like `order_by`/`status`), a cursor combined with criteria/order/
 * offset, `null` in a non-nullable operand position, and empty `AND`/`OR`
 * arrays. Note the undefined-skipping rule applies at field/operator
 * positions; an AND/OR *branch* whose every filter is undefined throws rather
 * than silently changing what the group matches — conditionalize the array
 * (`OR: cond ? [a, b] : [a]`) instead of a branch's fields.
 */
export function buildListQuery(options?: AnyListOptions): WireListQuery {
  if (options === undefined) return {}

  for (const key of Object.keys(options)) {
    if (!KNOWN_OPTION_KEYS.has(key)) {
      throw new TypeError(
        `unknown list option \`${key}\` — expected where/orderBy/limit/offset/cursor. ` +
          'Raw criteria params (`order_by`, `and`, `status: { eq }`, …) are no longer accepted; ' +
          'use `{ where, orderBy }`.'
      )
    }
  }

  if (options.cursor !== undefined) {
    const conflicting = (['where', 'orderBy', 'offset'] as const).filter(
      (key) => options[key] !== undefined
    )
    if (conflicting.length > 0) {
      throw new TypeError(
        `a continuation cursor cannot be combined with ${conflicting.join('/')}: ` +
          'the cursor already encodes criteria, order, and page size, and the API rejects the combination'
      )
    }
    const query: WireListQuery = { cursor: options.cursor }
    if (options.limit !== undefined) query.limit = options.limit
    return query
  }

  const query: WireListQuery = {}
  if (options.limit !== undefined) query.limit = options.limit
  if (options.offset !== undefined) query.offset = options.offset

  if (options.orderBy !== undefined) {
    const orderBy = Array.isArray(options.orderBy) ? [...options.orderBy] : [options.orderBy]
    if (orderBy.length > 0) query.order_by = orderBy as string[]
  }

  if (options.where !== undefined) {
    const criteria = translateWhere('where', options.where as UnknownRecord)
    if (criteria !== undefined) query.and = [criteria]
  }

  return query
}
