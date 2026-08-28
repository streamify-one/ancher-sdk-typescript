#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const declarationFiles = ['dist/tanstack.d.ts', 'dist/tanstack.d.cts']
const dataTagSymbols = ['dataTagErrorSymbol', 'dataTagSymbol']
const tanstackImport =
  /import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+['"]@tanstack\/react-query['"]/gs

for (const relativePath of declarationFiles) {
  const path = resolve(relativePath)
  const declaration = readFileSync(path, 'utf8')
  const importedSymbols = new Set(
    [...declaration.matchAll(tanstackImport)].flatMap((match) =>
      (match[1] ?? '').split(',').map((binding) => {
        const names = binding.trim().replace(/^type\s+/, '').split(/\s+as\s+/)
        return names.at(-1)
      }),
    ),
  )
  const missingSymbols = dataTagSymbols.filter(
    (symbol) => declaration.includes(`[${symbol}]`) && !importedSymbols.has(symbol),
  )

  // The current declaration bundler omits imports used by computed TanStack data-tag members.
  if (missingSymbols.length > 0) {
    const symbolImport = `import { ${missingSymbols.join(', ')} } from '@tanstack/react-query';\n`
    writeFileSync(path, `${symbolImport}${declaration}`)
  }
}
