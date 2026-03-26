import { defineConfig } from 'vitest/config';
import { config } from 'dotenv';

// Load .env for local test runs.
// In CI the env vars are injected directly by the workflow job,
// so this is a no-op there (dotenv does not override existing process.env vars).
config();

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    clearMocks: true,
  },
});
