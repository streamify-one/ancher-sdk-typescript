#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const scratch = mkdtempSync(join(tmpdir(), 'ancher-sdk-package-'))
const consumer = join(scratch, 'consumer')

function run(command, args, options = {}) {
  execFileSync(command, args, {
    cwd: consumer,
    encoding: 'utf8',
    stdio: 'inherit',
    ...options,
  })
}

function packageRoot(specifier) {
  return dirname(require.resolve(`${specifier}/package.json`))
}

function linkPackage(specifier) {
  const destination = join(consumer, 'node_modules', ...specifier.split('/'))
  if (existsSync(destination)) return
  mkdirSync(dirname(destination), { recursive: true })
  symlinkSync(packageRoot(specifier), destination, 'junction')
}

function cleanNpmEnvironment() {
  return Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !key.toLowerCase().startsWith('npm_config_')),
  )
}

try {
  mkdirSync(consumer, { recursive: true })

  const packed = JSON.parse(
    execFileSync('pnpm', ['pack', '--pack-destination', scratch, '--json'], {
      encoding: 'utf8',
    }),
  )
  const tarball = packed.filename

  run(
    'npm',
    ['install', tarball, '--ignore-scripts', '--no-audit', '--no-fund'],
    { env: { ...cleanNpmEnvironment(), NPM_CONFIG_CACHE: join(scratch, 'npm-cache') } },
  )

  linkPackage('@tanstack/react-query')
  linkPackage('@types/react')

  writeFileSync(join(consumer, 'package.json'), '{"type":"module"}\n')
  writeFileSync(
    join(consumer, 'consumer.ts'),
    `import { createAncherClient, createAncherSdk } from '@ancher-ai/sdk'
import { NoteStatus, type Note } from '@ancher-ai/sdk/contracts'
import { createOAuth2Auth } from '@ancher-ai/sdk/oauth2'
import { createTanstackClient } from '@ancher-ai/sdk/tanstack'

void createAncherClient
void createAncherSdk
void createOAuth2Auth
void createTanstackClient

const status: Note['status'] = NoteStatus.Ready
void status
`,
  )
  writeFileSync(
    join(consumer, 'consumer.cts'),
    `import { createAncherClient, createAncherSdk } from '@ancher-ai/sdk'
import { NoteStatus, type Note } from '@ancher-ai/sdk/contracts'
import { createOAuth2Auth } from '@ancher-ai/sdk/oauth2'
import { createTanstackClient } from '@ancher-ai/sdk/tanstack'

void createAncherClient
void createAncherSdk
void createOAuth2Auth
void createTanstackClient

const status: Note['status'] = NoteStatus.Ready
void status
`,
  )
  writeFileSync(
    join(consumer, 'tsconfig.json'),
    `${JSON.stringify(
      {
        compilerOptions: {
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          noEmit: true,
          skipLibCheck: false,
          strict: true,
          target: 'ES2022',
        },
        include: ['consumer.ts', 'consumer.cts'],
      },
      null,
      2,
    )}\n`,
  )
  writeFileSync(
    join(consumer, 'consumer.mjs'),
    `await import('@ancher-ai/sdk')
await import('@ancher-ai/sdk/contracts')
await import('@ancher-ai/sdk/oauth2')
await import('@ancher-ai/sdk/tanstack')
`,
  )
  writeFileSync(
    join(consumer, 'consumer.cjs'),
    `require('@ancher-ai/sdk')
require('@ancher-ai/sdk/contracts')
require('@ancher-ai/sdk/oauth2')
require('@ancher-ai/sdk/tanstack')
`,
  )

  const manifest = JSON.parse(
    readFileSync(join(consumer, 'node_modules', '@ancher-ai', 'sdk', 'package.json'), 'utf8'),
  )
  for (const entry of ['.', './contracts', './oauth2', './tanstack']) {
    if (!manifest.exports?.[entry]) throw new Error(`Published manifest is missing export ${entry}`)
  }

  run(process.execPath, [require.resolve('typescript/bin/tsc'), '-p', 'tsconfig.json'])
  run(process.execPath, ['consumer.mjs'])
  run(process.execPath, ['consumer.cjs'])
} finally {
  rmSync(scratch, { force: true, recursive: true })
}
