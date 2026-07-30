/**
 * Fetch the latest OpenAPI spec from the API server
 * and save it to openapi.json at the project root.
 *
 * Usage: node scripts/fetch-openapi.js [url]
 *   Source URL resolution (first match wins):
 *     1. the [url] CLI argument
 *     2. the ANCHER_OPENAPI_URL env var — export it in your shell or pass it
 *        inline (this plain Node script does NOT auto-load .env files); point it
 *        at the dev API to pick up unreleased schema
 *     3. the public default, https://api.ancher.ai/api/v1/openapi.json
 */

import { writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const API_URL =
  process.argv[2] ||
  process.env.ANCHER_OPENAPI_URL ||
  'https://api.ancher.ai/api/v1/openapi.json' //'http://localhost:5002/api/v1/openapi.json'
const OUTPUT = resolve(__dirname, '..', 'openapi.json')

async function main() {
  console.log(`Fetching OpenAPI spec from ${API_URL} ...`)

  const res = await fetch(API_URL)

  if (!res.ok) {
    throw new Error(`Failed to fetch: ${res.status} ${res.statusText}`)
  }

  const spec = await res.json()

  // Remove endpoints tagged with ignored tags
  const IGNORED_TAGS = new Set(['Feishu', 'Slack', 'OAuth2'])
  for (const [path, methods] of Object.entries(spec.paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      if (operation.tags?.some(tag => IGNORED_TAGS.has(tag))) {
        delete methods[method]
      }
    }
    if (Object.keys(methods).length === 0) {
      delete spec.paths[path]
    }
  }

  // Strip transport-injected header parameters from every operation. The SDK
  // transport sets these automatically (CSRF double-submit, device id, timezone,
  // and the analytics session context a host supplies through `getHeaders`), so
  // leaving them in the spec would force callers to pass a required `header`
  // argument on every typed request.
  const STRIPPED_HEADERS = new Set([
    'x-csrf-token',
    'x-device-id',
    'x-timezone',
    'x-ga-client-id',
    'x-ga-session-id',
  ])
  for (const methods of Object.values(spec.paths)) {
    for (const operation of Object.values(methods)) {
      if (!operation || typeof operation !== 'object' || !Array.isArray(operation.parameters)) {
        continue
      }
      operation.parameters = operation.parameters.filter(
        p => !(p?.in === 'header' && STRIPPED_HEADERS.has(String(p.name).toLowerCase()))
      )
    }
  }

  // Strip x-data-frame-schema extensions — they use JSON Schema $defs
  // which typed-openapi's ref parser cannot resolve
  stripExtension(spec, 'x-data-frame-schema')

  function stripExtension(obj, key) {
    if (obj == null || typeof obj !== 'object') return
    if (Array.isArray(obj)) {
      for (const item of obj) stripExtension(item, key)
    } else {
      delete obj[key]
      for (const v of Object.values(obj)) stripExtension(v, key)
    }
  }

  writeFileSync(OUTPUT, JSON.stringify(spec, null, 2) + '\n')

  console.log(`Saved to ${OUTPUT}`)
}

main().catch(err => {
  console.error(err.message)
  process.exit(1)
})
