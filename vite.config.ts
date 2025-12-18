import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // Note: mode parameter kept for TypeScript type inference, but not used
    // because drop_console is temporarily disabled for debugging
    console.log('Build mode:', mode); // This will be removed by terser in production anyway
    
    const isTest = mode === 'test';
    
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
          // Polyfill Node.js modules ONLY for tests, not for production
          ...(isTest ? {
            'node:path': 'path-browserify',
            'node:url': 'url',
            'node:process': 'process/browser',
          } : {}),
        },
        // Prioritize browser builds over node builds
        conditions: isTest 
          ? ['node', 'import', 'module', 'browser', 'default']
          : ['browser', 'module', 'import', 'default'],
      },
      optimizeDeps: {
        include: [
          '@noble/curves', 
          '@noble/hashes', 
          '@noble/ed25519',
          'react-markdown',
          'remark-gfm',
        ],
        exclude: [
          'puppeteer',
          'puppeteer-core',
          'playwright',
          'playwright-core',
          'chromium-bidi',
          'jsdom',
          'vfile',
          'vfile-message',
          'unist-util-stringify-position',
        ],
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
          external: [
            'jsdom',
            'vitest',
            'puppeteer',
            'puppeteer-core',
            'playwright',
            'playwright-core',
            'chromium-bidi',
          ],
          output: {
            // Explicit file naming to ensure proper cache busting
            chunkFileNames: 'assets/[name]-[hash].js',
            entryFileNames: 'assets/[name]-[hash].js',
            assetFileNames: 'assets/[name]-[hash].[ext]',
            manualChunks: {
              'react-vendor': ['react', 'react-dom'],
              'router': ['react-router-dom'],
              'knowledge-base': ['./data/geoKnowledgeBase'],
            },
          },
        },
        terserOptions: {
          compress: {
            drop_console: false, // TEMPORARILY DISABLED for production debugging
            passes: 2, // Additional optimization pass
          },
          mangle: {
            safari10: true, // Safari 10/11 bug fix
          },
        },
      },
    };
});
