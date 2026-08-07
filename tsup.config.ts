import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    oauth2: 'src/presets/oauth2.ts',
    tanstack: 'src/tanstack.ts',
    contracts: 'src/contracts/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
  // React Query is a peer dependency — never bundle it into the SDK.
  external: ['@tanstack/react-query'],
})
