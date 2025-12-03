import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Don't use the api setup file for migration tests
    setupFiles: [],
  },
});
