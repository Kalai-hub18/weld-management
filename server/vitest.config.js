import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.js'],
    include: ['./tests/**/*.test.js'],
    // Some integration-style API tests can take >5s on Windows/CI.
    testTimeout: 20000,
  },
})


