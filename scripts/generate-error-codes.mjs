/**
 * Generate the typed API error-code catalog (`src/api/error-codes.ts`) from the
 * backend's authoritative registry (`app/errors.py` in the Ancher API repo).
 *
 * The backend defines every error as `NAME = ErrorDefinition('API-XXYZZZ', 'message', status)`.
 * This script parses that enum and the module/layer legend in the module
 * docstring, then emits a fully-typed, tree-shakeable TS catalog so SDK
 * consumers get the machine-readable code, the canonical message, the HTTP
 * status, and the module/layer breakdown for any error the API returns.
 *
 * Usage: node scripts/generate-error-codes.mjs [path-to-errors.py]
 *   Default: ../../../api/app/errors.py (sibling Ancher API repo in the monorepo).
 *
 * This is the error-catalog half of the codegen pipeline (the OpenAPI half lives
 * in fetch-openapi.js). Never hand-edit src/api/error-codes.ts — rerun this.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ERRORS_PY =
  process.argv[2] || resolve(__dirname, '..', '..', '..', '..', 'api', 'app', 'errors.py')
const OUTPUT = resolve(__dirname, '..', 'src', 'api', 'error-codes.ts')

function parseModuleLegend(src) {
  // Lines like: "- FL: File operations" inside the "Module Codes:" block.
  const modules = {}
  const block = src.slice(src.indexOf('Module Codes:'), src.indexOf('Layer Codes:'))
  for (const m of block.matchAll(/^\s*-\s*([A-Z0-9]{2,3}):\s*(.+?)\s*$/gm)) {
    modules[m[1]] = m[2]
  }
  const layers = {}
  const layerBlock = src.slice(src.indexOf('Layer Codes:'))
  for (const m of layerBlock.matchAll(/^\s*-\s*([A-Z]):\s*(.+?)\s*$/gm)) {
    layers[m[1]] = m[2].replace(/"""\s*$/, '').trim()
  }
  return { modules, layers }
}

function parseDefinitions(src) {
  // NAME = ErrorDefinition('API-XXYZZZ', 'message', status) — possibly multiline.
  const defs = []
  const re =
    /^\s{4}([A-Z][A-Z0-9_]+)\s*=\s*ErrorDefinition\(\s*'([^']+)'\s*,\s*'((?:[^'\\]|\\.)*)'\s*,\s*(\d+)\s*,?\s*\)/gms
  for (const m of src.matchAll(re)) {
    defs.push({ name: m[1], code: m[2], message: m[3].replace(/\\'/g, "'"), status: Number(m[4]) })
  }
  return defs
}

function main() {
  const src = readFileSync(ERRORS_PY, 'utf8')
  const { modules, layers } = parseModuleLegend(src)
  const defs = parseDefinitions(src)
  if (defs.length === 0) throw new Error(`Parsed 0 error definitions from ${ERRORS_PY}`)

  // Detect duplicate codes (the backend has a couple of out-of-order entries).
  const seen = new Map()
  for (const d of defs) {
    if (seen.has(d.code)) {
      console.warn(`WARN duplicate code ${d.code} (${seen.get(d.code)} / ${d.name})`)
    } else {
      seen.set(d.code, d.name)
    }
  }

  const q = s => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
  const sorted = [...defs].sort((a, b) => a.code.localeCompare(b.code))

  const defLines = sorted
    .map(d => `  ${q(d.code)}: { name: '${d.name}', message: ${q(d.message)}, status: ${d.status} },`)
    .join('\n')
  const nameToCode = [...defs]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(d => `  ${d.name}: ${q(d.code)},`)
    .join('\n')
  const moduleLines = Object.entries(modules)
    .map(([k, v]) => `  ${q(k)}: ${q(v)},`)
    .join('\n')
  const layerLines = Object.entries(layers)
    .map(([k, v]) => `  ${q(k)}: ${q(v)},`)
    .join('\n')

  const out = `/**
 * Typed catalog of every Ancher API error code.
 *
 * GENERATED FILE — do not edit by hand. Regenerate with
 * \`node scripts/generate-error-codes.mjs\` (parses the backend's app/errors.py).
 *
 * Codes follow \`API-XXYZZZ\`: a 2–3 char module, a 1 char layer, a 3 digit
 * sequence. Use {@link getErrorDefinition} / {@link AncherApiError.definition}
 * to resolve a code to its canonical message + HTTP status, and
 * {@link ApiErrorCodes} for ergonomic, autocompleted references to specific codes.
 */

/** Canonical definition of a single API error code. */
export interface ApiErrorDefinition {
  /** The backend enum identifier, e.g. \`BILLING_INSUFFICIENT_CREDITS\`. */
  name: string
  /** Human-readable default message. */
  message: string
  /** HTTP status the backend returns with this code. */
  status: number
}

/** Every error code the API can return, mapped to its canonical definition. */
export const API_ERROR_DEFINITIONS = {
${defLines}
} as const

/** A known API error code string, e.g. \`'API-BIS002'\`. */
export type ApiErrorCode = keyof typeof API_ERROR_DEFINITIONS

/**
 * Ergonomic, autocompleted references to specific codes by their backend enum
 * name, e.g. \`ApiErrorCodes.BILLING_INSUFFICIENT_CREDITS === 'API-BIS002'\`.
 */
export const ApiErrorCodes = {
${nameToCode}
} as const satisfies Record<string, ApiErrorCode>

/** Module-code legend (the \`XX\` segment of a code → what subsystem it belongs to). */
export const API_ERROR_MODULES: Record<string, string> = {
${moduleLines}
}

/** Layer-code legend (the \`Y\` segment of a code → which layer raised it). */
export const API_ERROR_LAYERS: Record<string, string> = {
${layerLines}
}

/** Resolve a code string to its canonical {@link ApiErrorDefinition}, if known. */
export function getErrorDefinition(code: string | undefined | null): ApiErrorDefinition | undefined {
  if (!code) return undefined
  return (API_ERROR_DEFINITIONS as Record<string, ApiErrorDefinition>)[code]
}

/** Split a code into its module / layer / sequence parts, e.g. \`API-BIS002\` → \`{ module: 'BI', layer: 'S', sequence: '002' }\`. */
export function parseErrorCode(
  code: string | undefined | null
): { module: string; moduleName?: string; layer: string; layerName?: string; sequence: string } | undefined {
  if (!code) return undefined
  const m = /^API-([A-Z]{2,3})([A-Z])(\\d{3})$/.exec(code)
  const mod = m?.[1]
  const layer = m?.[2]
  const sequence = m?.[3]
  if (mod === undefined || layer === undefined || sequence === undefined) return undefined
  return {
    module: mod,
    moduleName: API_ERROR_MODULES[mod],
    layer,
    layerName: API_ERROR_LAYERS[layer],
    sequence,
  }
}
`
  writeFileSync(OUTPUT, out)
  console.log(`Wrote ${defs.length} error codes (${seen.size} unique) → ${OUTPUT}`)
}

main()
