import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./api/__tests__/vitest-setup.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'tests/1step-handshake.test.ts',
      'tests/agent-gateway.test.ts',
      'test/consensus/**',
      'test/mesh/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/types/',
        '**/__tests__/',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@noble/curves/ed25519': '@noble/curves/ed25519.js',
      '@noble/curves/bls12-381': '@noble/curves/bls12-381.js',
      '@noble/hashes/sha2': '@noble/hashes/sha2.js',
      '@noble/hashes/sha3': '@noble/hashes/sha3.js',
      '@noble/hashes/utils': '@noble/hashes/utils.js',
    },
    conditions: ['node', 'import', 'module', 'browser', 'default'],
  },
  optimizeDeps: {
    include: ['@noble/curves', '@noble/hashes', '@noble/ed25519'],
    esbuildOptions: {
      target: 'esnext',
    },
  },
});
