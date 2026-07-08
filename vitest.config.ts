import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // The SDK transport is runtime-agnostic; tests exercise it under Node with
    // stubbed `fetch` / config hooks (no DOM).
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
