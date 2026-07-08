/**
 * Compile-time assertion helpers + the runtime enum guard.
 *
 * The enum constants in this package are hand-written const objects whose
 * values must exactly mirror a generated union. Each enum carries a
 * two-directional drift check:
 *
 * ```ts
 * export const NoteStatus = {
 *   Queued: 'queued', Processing: 'processing', Ready: 'ready', Error: 'error',
 * } as const satisfies Record<string, Schemas.Note['status']>   // ← extra value fails here
 * export type NoteStatus = (typeof NoteStatus)[keyof typeof NoteStatus]
 * type _NoteStatusExhaustive = Expect<Eq<NoteStatus, Schemas.Note['status']>> // ← missing value fails here
 * ```
 *
 * A codegen refresh that changes the union breaks `pnpm typecheck` until the
 * constant is updated — the constants can never silently drift from the API.
 */

/** Resolves only when `T` is exactly `true`; anything else is a type error. */
export type Expect<T extends true> = T

/** `true` when `A` and `B` are mutually assignable (equal up to assignability). */
export type Eq<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false

/**
 * Runtime guard: is `value` one of `enumObj`'s values?
 *
 * For validating untyped input (CLI flags, URL search params) against an enum
 * const object: `isEnumValue(NoteStatus, raw)` narrows `raw` to `NoteStatus`.
 */
export function isEnumValue<T extends Record<string, string>>(
  enumObj: T,
  value: unknown
): value is T[keyof T] {
  return (
    typeof value === 'string' && Object.values(enumObj).includes(value as T[keyof T])
  )
}
