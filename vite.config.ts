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
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        target: 'esnext',
        minify: 'terser',
        cssMinify: true,
        chunkSizeWarningLimit: 100, // 100KB warning threshold
        rollupOptions: {
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
