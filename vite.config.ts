import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env': {},
        'process.platform': JSON.stringify('browser'),
        'process.version': JSON.stringify(''),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
          // Polyfill Node.js modules for browser
          'node:path': 'path-browserify',
          'node:url': 'url',
          'node:process': 'process/browser',
        },
        // Fix @noble packages resolution for tests
        conditions: ['node', 'import', 'module', 'browser', 'default'],
      },
      optimizeDeps: {
        include: ['@noble/curves', '@noble/hashes', '@noble/ed25519'],
        exclude: ['vfile'],
        esbuildOptions: {
          target: 'esnext',
        },
      },
      build: {
        target: 'esnext',
        minify: 'terser',
        cssMinify: true,
        chunkSizeWarningLimit: 100, // 100KB warning threshold
        rollupOptions: {
          external: ['vfile', 'node:path', 'node:url', 'node:process', 'module'],
          output: {
            manualChunks: {
              'react-vendor': ['react', 'react-dom'],
              'router': ['react-router-dom'],
              'knowledge-base': ['./data/geoKnowledgeBase'],
            },
          },
        },
        terserOptions: {
          compress: {
            drop_console: mode === 'production',
            passes: 2, // Additional optimization pass
          },
          mangle: {
            safari10: true, // Safari 10/11 bug fix
          },
        },
      },
    };
});
