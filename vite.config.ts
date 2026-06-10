import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/renderer/components'),
      '@panels': path.resolve(__dirname, './src/renderer/panels'),
      '@hooks': path.resolve(__dirname, './src/renderer/hooks'),
      '@store': path.resolve(__dirname, './src/renderer/store'),
      '@core': path.resolve(__dirname, './src/core'),
      '@database': path.resolve(__dirname, './src/database'),
    },
  },
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          charts: ['lightweight-charts'],
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: false,
  },
});
